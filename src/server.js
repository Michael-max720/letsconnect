require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Lets Connect server running on http://localhost:${PORT}`);
  await testConnection();
});
