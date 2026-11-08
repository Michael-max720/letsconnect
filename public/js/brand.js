/* One place to rebrand the whole app */
window.BRAND = {
  name: "Lets Connect",
  letter: "L",
  plate: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1600&auto=format&fit=crop",
  video: "" // optional: put an .mp4 URL here to get a looping video over the photo
};
document.querySelectorAll("[data-brand]").forEach(e => e.textContent = BRAND.name);
document.querySelectorAll("[data-letter]").forEach(e => e.textContent = BRAND.letter);
document.title = document.title.replace("{brand}", BRAND.name);
document.querySelectorAll(".media").forEach(m => {
  m.style.backgroundImage = `url(${BRAND.plate})`;
  if (!BRAND.video || matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const v = document.createElement("video");
  Object.assign(v, {src: BRAND.video, muted: true, loop: true, playsInline: true, autoplay: true});
  v.addEventListener("loadeddata", () => v.classList.add("ready"));
  m.append(v); v.play().catch(() => {});
});
document.querySelectorAll(".eye").forEach(b => b.addEventListener("click", () => {
  const i = b.parentElement.querySelector("input"), show = i.type === "password";
  i.type = show ? "text" : "password"; b.setAttribute("aria-pressed", show);
}));
document.querySelectorAll(".dots").forEach(d => d.addEventListener("click", e => {
  if (e.target.tagName !== "BUTTON") return;
  d.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === e.target));
}));