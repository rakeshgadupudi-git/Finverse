require('dotenv').config();
const app = require('./app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5001;

const start = async () => {
  await connectDB();

  // ── Cron jobs ────────────────────────────────────────────────────────────
  try {
    const cron         = require('node-cron');
    const Bill         = require('./src/models/Bill');
    const Alert        = require('./src/models/Alert');
    const Notification = require('./src/models/Notification');
    const { getNextDueDate } = require('./src/controllers/billController');
    const apiBase      = process.env.API_SERVICE_URL || 'http://localhost:5000';

    // Daily at 09:00 — bill reminders
    cron.schedule('0 9 * * *', async () => {
      console.log('[CRON] Running daily bill reminder check…');
      try {
        const bills = await Bill.find({ isActive: true });
        const today = new Date();
        for (const bill of bills) {
          const next = getNextDueDate(bill);
          const daysUntil = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
          if (daysUntil <= bill.reminderDaysBefore && daysUntil >= 0) {
            console.log(`[REMINDER] Bill "${bill.name}" for userId ${bill.userId} is due in ${daysUntil} day(s) (₹${bill.amount})`);
            try {
              const msg = daysUntil === 0
                ? `Your bill "${bill.name}" of ₹${bill.amount} is due TODAY.`
                : `Your bill "${bill.name}" of ₹${bill.amount} is due in ${daysUntil} day(s).`;
              await Notification.create({
                userId:  bill.userId,
                title:   daysUntil === 0 ? 'Bill Due Today' : `Bill Due in ${daysUntil} Day${daysUntil > 1 ? 's' : ''}`,
                message: msg,
                type:    'bill',
              });
            } catch (e) {
              console.error('[CRON] Failed to create bill notification:', e.message);
            }
          }
        }
      } catch (err) {
        console.error('[CRON] Bill reminder error:', err.message);
      }
    });

    console.log('[CRON] Bill reminder job scheduled at 09:00 daily');

    // Every 15 minutes — price alert check
    cron.schedule('*/15 * * * *', async () => {
      try {
        const alerts = await Alert.find({ isActive: true });
        if (alerts.length === 0) return;

        for (const alert of alerts) {
          try {
            const resp = await fetch(
              `${apiBase}/api/live-price?ticker=${encodeURIComponent(alert.ticker)}`,
              { signal: AbortSignal.timeout(4000) }
            );
            if (!resp.ok) continue;
            const json  = await resp.json();
            const price = json?.data?.price;
            if (price == null) continue;

            const triggered =
              (alert.direction === 'ABOVE' && price >= alert.targetPrice) ||
              (alert.direction === 'BELOW' && price <= alert.targetPrice);

            if (triggered) {
              alert.isActive     = false;
              alert.triggeredAt  = new Date();
              await alert.save();

              const direction = alert.direction === 'ABOVE' ? 'rose above' : 'fell below';
              await Notification.create({
                userId:  alert.userId,
                title:   `Price Alert Triggered: ${alert.ticker}`,
                message: `${alert.ticker} ${direction} ₹${alert.targetPrice}. Current price: ₹${price}.`,
                type:    'alert',
              });
              console.log(`[ALERT] ${alert.ticker} triggered at ₹${price} (target ₹${alert.targetPrice})`);
            }
          } catch (e) {
            // skip this alert on individual error
          }
        }
      } catch (err) {
        console.error('[CRON] Alert check error:', err.message);
      }
    });

    console.log('[CRON] Price alert job scheduled every 15 minutes');

    // Daily at 09:00 — warranty expiry alerts
    cron.schedule('0 9 * * *', async () => {
      console.log('[CRON] Running warranty expiry check…');
      try {
        const Warranty = require('./src/models/Warranty');
        const now = new Date();
        const warranties = await Warranty.find({ isActive: true });
        for (const w of warranties) {
          const exp = new Date(w.purchaseDate);
          exp.setMonth(exp.getMonth() + w.warrantyMonths);
          const monthsLeft = Math.ceil((exp - now) / (30 * 24 * 3600 * 1000));
          if (monthsLeft >= 0 && monthsLeft <= w.reminderMonthsBefore) {
            try {
              await Notification.create({
                userId:  w.userId,
                title:   `Warranty Expiring: ${w.productName}`,
                message: `Warranty for ${w.productName} expires ${monthsLeft === 0 ? 'this month' : `in ${monthsLeft} month(s)`} on ${exp.toLocaleDateString('en-IN')}.`,
                type:    'system',
              });
            } catch (e) {
              console.error('[CRON] Warranty notification error:', e.message);
            }
          }
        }
      } catch (err) {
        console.error('[CRON] Warranty expiry check error:', err.message);
      }
    });

    // Daily at 09:00 — planned payment reminders (piggybacks same daily cron via separate schedule)
    cron.schedule('5 9 * * *', async () => {
      console.log('[CRON] Running planned payment reminder check…');
      try {
        const PlannedPayment = require('./src/models/PlannedPayment');
        const now = new Date();
        const payments = await PlannedPayment.find({ isActive: true, status: 'pending' });
        for (const p of payments) {
          const daysLeft = Math.ceil((new Date(p.scheduledDate) - now) / (1000 * 60 * 60 * 24));
          if (daysLeft >= 0 && daysLeft <= p.reminderDaysBefore) {
            try {
              await Notification.create({
                userId:  p.userId,
                title:   `Payment Due: ${p.title}`,
                message: `${p.title} of ₹${p.amount} is due ${daysLeft === 0 ? 'today' : `in ${daysLeft} day(s)`}.`,
                type:    'system',
              });
            } catch (e) {
              console.error('[CRON] Planned payment notification error:', e.message);
            }
          }
        }
      } catch (err) {
        console.error('[CRON] Planned payment reminder error:', err.message);
      }
    });

    console.log('[CRON] Warranty + planned payment jobs scheduled');
  } catch (err) {
    console.warn('[CRON] node-cron not available — background jobs disabled. Run: npm install node-cron');
  }

  app.listen(PORT, () => {
    console.log(`FinTracker server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
};

start();
