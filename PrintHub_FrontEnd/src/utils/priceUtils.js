// Re-export price utilities from appUtils to satisfy stash-introduced
// import paths in Product-detail.js and CheckoutModal.js.
export { extractNumericPrice, formatPrice } from "./appUtils";
