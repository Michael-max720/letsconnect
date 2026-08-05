// src/controllers/payment.controller.js
const ticketCategoryModel = require('../models/ticketCategory.model');
const ticketModel = require('../models/ticket.model');
const transactionModel = require('../models/transaction.model');
const mpesaUtil = require('../utils/mpesa.util');

async function initiateCheckout(req, res) {
  const { categoryId, quantity, phoneNumber } = req.body;

  if (!categoryId || !quantity || !phoneNumber) {
    return res.status(400).json({ error: 'categoryId, quantity and phoneNumber are required.' });
  }

  // 1. Look up the real category — never trust a price from the client
  const category = await ticketCategoryModel.findCategoryById(categoryId);
  if (!category) return res.status(404).json({ error: 'Ticket category not found.' });

  // 2. Enforce quota — FR-3.3
  const sold = await ticketModel.countSoldForCategory(categoryId);
  if (sold + quantity > category.quota) {
    return res.status(409).json({ error: 'Not enough tickets remaining in this category.' });
  }

  // 3. Server calculates the amount — never trust it from the client
  const amount = category.price * quantity;

  // 4. Reserve the tickets (status = 'reserved', not yet paid)
  const ticketIds = await ticketModel.reserveTickets({
    categoryId,
    buyerId: req.session.userId,
    quantity,
  });

  // 5. Create a transaction record (status = 'pending')
  const transactionId = await transactionModel.createTransaction({
    buyerId: req.session.userId,
    amount,
    paymentMethod: 'mpesa',
  });
  await ticketModel.attachTransaction(ticketIds, transactionId);
  // 6. Ask Safaricom to prompt the buyer's phone
  try {
    const stkResponse = await mpesaUtil.initiateStkPush({
      phoneNumber,
      amount,
      accountReference: `LC-${transactionId}`,
      transactionDesc: `Lets Connect ticket purchase`,
    });
    await transactionModel.attachCheckoutRequestId(transactionId, stkResponse.CheckoutRequestID);
    res.json({
      message: "STK push sent. Check your phone to enter your M-Pesa PIN.",
      transactionId,
      ticketIds,
      checkoutRequestId: stkResponse.CheckoutRequestID,
    });
 } catch (err) {
    await transactionModel.markFailed(transactionId);
    res.status(502).json({ error: 'Could not reach M-Pesa. Please try again.' });
  }
}
async function handleCallback(req, res) {
  const callback = req.body.Body?.stkCallback;
  if (!callback) {
    return res.status(400).json({ error: 'Malformed callback payload.' });
  }

  const checkoutRequestId = callback.CheckoutRequestID;
  const resultCode = callback.ResultCode; // 0 = success

  const transaction = await transactionModel.findByCheckoutRequestId(checkoutRequestId);
  if (!transaction) {
    console.error('Callback for unknown transaction:', checkoutRequestId);
    return res.json({ ResultCode: 0, ResultDesc: 'Received' });
  }

  if (resultCode === 0) {
    const items = callback.CallbackMetadata?.Item || [];
    const receiptItem = items.find(i => i.Name === 'MpesaReceiptNumber');
    const mpesaReceipt = receiptItem ? receiptItem.Value : null;

    await transactionModel.markConfirmed(transaction.transaction_id, mpesaReceipt);

    const { pool } = require('../config/db');
    await pool.query(
      "UPDATE tickets SET status = 'paid' WHERE transaction_id = ?",
      [transaction.transaction_id]
    );

    const userModel = require('../models/user.model');
    const buyer = await userModel.findById(transaction.buyer_id);
    const [ticketRows] = await pool.query(
      `SELECT t.ticket_id, e.title AS event_title, e.event_date, e.venue
       FROM tickets t
       JOIN ticket_categories tc ON t.category_id = tc.category_id
       JOIN events e ON tc.event_id = e.event_id
       WHERE t.transaction_id = ?`,
      [transaction.transaction_id]
    );

    const { sendTicketConfirmation } = require('../utils/email.util');
    for (const t of ticketRows) {
      try {
        await sendTicketConfirmation({
          toEmail: buyer.email,
          eventTitle: t.event_title,
          eventDate: t.event_date,
          venue: t.venue,
          ticketId: t.ticket_id,
        });
      } catch (emailErr) {
        console.error('Email send failed for ticket', t.ticket_id, emailErr.message);
      }
    }
  } else {
    await transactionModel.markFailed(transaction.transaction_id);

    const { pool } = require('../config/db');
    await pool.query(
      "UPDATE tickets SET status = 'cancelled' WHERE transaction_id = ?",
      [transaction.transaction_id]
    );
  }

  res.json({ ResultCode: 0, ResultDesc: 'Received' });
}

module.exports = { initiateCheckout, handleCallback };