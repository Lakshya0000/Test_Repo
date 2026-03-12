const express = require("express");
const app = express();
app.use(express.json());

const seats = {};
["A", "B"].forEach((row) => {
  for (let i = 1; i <= 20; i++) {
    seats[`${row}${i}`] = { available: true, locked: false };
  }
});

let bookingCounter = 100;

function processPayment(payment) {
  const { payment_mode } = payment;

  if (payment_mode === "UPI") {
    if (!payment.upi_id) return { success: false, reason: "upi_id is required for UPI payment" };
    if (Math.random() < 0.2) return { success: false, reason: "UPI payment failed. Try again." };
    return { success: true };
  }

  if (payment_mode === "CREDIT_CARD") {
    if (!payment.card_number || !payment.cvv || !payment.expiry)
      return { success: false, reason: "card_number, cvv, and expiry are required for Credit Card payment" };
    if (Math.random() < 0.2) return { success: false, reason: "Credit card payment declined." };
    return { success: true };
  }

  if (payment_mode === "WALLET") {
    if (!payment.wallet_id) return { success: false, reason: "wallet_id is required for Wallet payment" };
    if (typeof payment.balance !== "number" || payment.balance < 100)
      return { success: false, reason: "Insufficient wallet balance (minimum ₹100 required)." };
    if (Math.random() < 0.2) return { success: false, reason: "Wallet payment failed." };
    return { success: true };
  }

  return { success: false, reason: `Unsupported payment_mode: ${payment_mode}. Use UPI, CREDIT_CARD, or WALLET.` };
}

app.get("/seats/:seatId", (req, res) => {
  const seatId = req.params.seatId.toUpperCase();
  const seat = seats[seatId];

  if (!seat) {
    return res.status(404).json({ error: `Seat ${seatId} does not exist.` });
  }

  res.json({ seat_id: seatId, available: seat.available });
});

app.post("/book", (req, res) => {
  const { user, seat_id, payment } = req.body;

  if (!user || !seat_id || !payment) {
    return res.status(400).json({ error: "user, seat_id, and payment are required." });
  }

  const seatId = seat_id.toUpperCase();
  const seat = seats[seatId];

  if (!seat) {
    return res.status(404).json({ error: `Seat ${seatId} does not exist.` });
  }

  if (seat.locked) {
    return res.status(409).json({ error: `Seat ${seatId} is currently being processed. Please try again.` });
  }

  if (!seat.available) {
    return res.status(409).json({ error: `Seat ${seatId} is already booked.` });
  }

  seat.locked = true;

  try {
    const paymentResult = processPayment(payment);

    if (!paymentResult.success) {
      seat.locked = false;
      return res.status(402).json({ error: `Payment failed: ${paymentResult.reason}` });
    }

    seat.available = false;
    seat.locked = false;
    const bookingId = `B${++bookingCounter}`;

    res.status(201).json({ booking_id: bookingId, seat_id: seatId, status: "CONFIRMED" });
  } catch (err) {
    seat.locked = false; 
    res.status(500).json({ error: "Internal server error." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎬 Dhurandhar Ticket Booking API running on http://localhost:${PORT}`);
});
