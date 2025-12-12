// 🧾 إنشاء فاتورة شراء جديدة مع التحقق من رصيد الصندوق
// import { query } from '../libraries/Database.js';
// import { addNotification } from '../utils/notificationService.js';

import { query, getClient } from "../libraries/Database.js";

export async function addBuyInvoice(req, res) {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const {
      buy_invoice_code,
      purchased_product_name,
      invoice_price_total,
      paid_price_D,
      paid_price_SP,
      discount,
      note,
      bought_date,
      money_type,
      buy_invoice_exchange_rate,
      saller_id
    } = req.body;

    const totalAfterDiscount = invoice_price_total - (discount || 0);

    // // 1️⃣ التحقق من الصندوق
    // const fundRes = await client.query(
    //   `SELECT * FROM "Funds" WHERE fund_id = $1`,
    //   [fund_id]
    // );

    // if (fundRes.rows.length === 0) {
    //   await client.query("ROLLBACK");
    //   return res.status(404).json({ message: "❌ الصندوق غير موجود" });
    // }

    // const fund = fundRes.rows[0];

    // // 2️⃣ التحقق من رصيد الصندوق
    // if (money_type === "Dollar" && fund.fund_account_D < totalAfterDiscount) {
    //   await client.query("ROLLBACK");
    //   return res.status(400).json({ message: "❌ رصيد الدولار غير كافٍ" });
    // }

    // if (money_type === "SP" && fund.fund_account_SP < totalAfterDiscount) {
    //   await client.query("ROLLBACK");
    //   return res.status(400).json({ message: "❌ رصيد الليرة غير كافٍ" });
    // }

    // 3️⃣ إدخال الفاتورة
    const invoiceResult = await client.query(
      `INSERT INTO "buy_invoice"
      (buy_invoice_code, purchased_product_name, invoice_price_total,
       "paid_price_D", "paid_price_SP", discount, note, bought_date,
       money_type, buy_invoice_exchange_rate, saller_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING buy_invoice_id`,
      [
        buy_invoice_code,
        purchased_product_name,
        invoice_price_total,
        paid_price_D,
        paid_price_SP,
        discount,
        note,
        bought_date,
        money_type,
        buy_invoice_exchange_rate,
        saller_id
      ]
    );

    const invoiceId = invoiceResult.rows[0].buy_invoice_id;

    // // 4️⃣ خصم المبلغ من الصندوق
    // if (money_type === "Dollar") {
    //   await client.query(
    //     `UPDATE "Funds"
    //      SET fund_account_D = fund_account_D - $1
    //      WHERE fund_id = $2`,
    //     [totalAfterDiscount, fund_id]
    //   );
    // } else {
    //   await client.query(
    //     `UPDATE "Funds"
    //      SET fund_account_SP = fund_account_SP - $1
    //      WHERE fund_id = $2`,
    //     [totalAfterDiscount, fund_id]
    //   );
    // }

    // 5️⃣ حساب العميل
    const clientRes = await client.query(
      `SELECT "client_account_D", "client_account_SP"
       FROM "Client" WHERE client_id = $1`,
      [saller_id]
    );

    if (clientRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "❌ العميل غير موجود" });
    }

    const acc = clientRes.rows[0];

    const newD =
      money_type === "Dollar"
        ? acc.client_account_D - totalAfterDiscount
        : acc.client_account_D;

    const newSP =
      money_type === "SP"
        ? acc.client_account_SP - totalAfterDiscount
        : acc.client_account_SP;

    await client.query(
      `UPDATE "Client"
       SET "client_account_D" = $1, "client_account_SP" = $2
       WHERE client_id = $3`,
      [newD, newSP, saller_id]
    );

    // // 6️⃣ سجل حركة العميل
    // await client.query(
    //   `INSERT INTO "Client_arragement"
    //    ("Client_arraged_name", account_before_arrangement, 
    //     "Creditor_and_debtor", account_after_arrangement,
    //     amount_diffience, "Client_arragement_date",
    //     note, money_type, client_id)
    //    VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,$8)`,
    //   [
    //     invoice_client_name,
    //     money_type === "Dollar" ? acc.client_account_D : acc.client_account_SP,
    //     "مدين",
    //     money_type === "Dollar" ? newD : newSP,
    //     totalAfterDiscount,
    //     note,
    //     money_type,
    //     saller_id
    //   ]
    // );

    // // 7️⃣ إضافة سجل مالي
    // await client.query(
    //   `INSERT INTO "Transaction"
    //    ("transacted_amount_D", "transacted_amount_SP", transaction_type,
    //     from_account, to_account, note, transaction_date,
    //     transaction_exchange_rate, money_type, 
    //     from_client_account_id, to_client_account_id)
    //    VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8,$9,$10)`,
    //   [
    //     invoice_paid_amount_D,
    //     invoice_paid_amount_SP,
    //     "فاتورة شراء",
    //     fund.fund_name,
    //     invoice_client_name,
    //     note,
    //     invoice_exchange_rate,
    //     money_type,
    //     fund_id,
    //     invoice_client_id
    //   ]
    // );

    await client.query("COMMIT");

    res.json({
      message: "✅ تمت إضافة فاتورة الشراء بنجاح",
      invoice_id: invoiceId
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error in addBuyInvoice:", err);
    res.status(500).json({ message: "حدث خطأ أثناء إضافة الفاتورة" });
  } finally {
    client.release();
  }
}

// 🟦 جلب جميع فواتير الشراء من قاعدة البيانات
export async function getAllBuyInvoices(req, res) {
  try {
    const result = await query(`SELECT * FROM "buy_invoice" ORDER BY buy_invoice_id DESC`);

    res.status(200).json({
      message: "تم جلب جميع فواتير الشراء بنجاح",
      invoices: result.rows
    });

  } catch (err) {
    console.error("❌ Error in getAllBuyInvoices:", err);
    res.status(500).json({ message: "حدث خطأ أثناء جلب فواتير الشراء" });
  }
}

export async function getBuyInvoiceById(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM "buy_invoice" WHERE buy_invoice_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "❌ لم يتم العثور على الفاتورة" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error in getBuyInvoiceById:", err);
    res.status(500).json({ message: "حدث خطأ أثناء جلب الفاتورة" });
  }
}

export async function updateBuyInvoice(req, res) {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const { id } = req.params;

    const {
      buy_invoice_code,
      purchased_product_name,
      invoice_price_total,
      paid_price_D,
      paid_price_SP,
      discount,
      note,
      bought_date,
      money_type,
      buy_invoice_exchange_rate,
      saller_id
    } = req.body;

    const newTotal = invoice_price_total - (discount || 0);

    // 1️⃣ جلب الفاتورة القديمة
    const oldRes = await client.query(
      `SELECT * FROM "buy_invoice" WHERE buy_invoice_id = $1`,
      [id]
    );

    if (oldRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "❌ الفاتورة غير موجودة" });
    }

    const old = oldRes.rows[0];
    const oldTotal = old.invoice_price_total - (old.discount || 0);

    // // 2️⃣ إرجاع مبلغ الفاتورة القديمة للصندوق
    // if (old.money_type === "Dollar") {
    //   await client.query(
    //     `UPDATE "Funds"
    //      SET fund_account_D = fund_account_D + $1
    //      WHERE fund_id = $2`,
    //     [oldTotal, old.fund_id]
    //   );
    // } else {
    //   await client.query(
    //     `UPDATE "Funds"
    //      SET fund_account_SP = fund_account_SP + $1
    //      WHERE fund_id = $2`,
    //     [oldTotal, old.fund_id]
    //   );
    // }

    // // 3️⃣ خصم المبلغ الجديد
    // if (money_type === "Dollar") {
    //   await client.query(
    //     `UPDATE "Funds"
    //      SET fund_account_D = fund_account_D - $1
    //      WHERE fund_id = $2`,
    //     [newTotal, fund_id]
    //   );
    // } else {
    //   await client.query(
    //     `UPDATE "Funds"
    //      SET fund_account_SP = fund_account_SP - $1
    //      WHERE fund_id = $2`,
    //     [newTotal, fund_id]
    //   );
    // }

    // 4️⃣ تعديل الفاتورة
    await client.query(
      `UPDATE "buy_invoice"
       SET buy_invoice_code = $1, purchased_product_name = $2, invoice_price_total = $3,
       "paid_price_D" = $4, "paid_price_SP" = $5, discount = $6, note = $7, bought_date = $8,
       money_type = $9, buy_invoice_exchange_rate = $10, saller_id = $11
       WHERE buy_invoice_id=$12`,
      [
        buy_invoice_code,
      purchased_product_name,
      invoice_price_total,
      paid_price_D,
      paid_price_SP,
      discount,
      note,
      bought_date,
      money_type,
      buy_invoice_exchange_rate,
      saller_id,
      id
      ]
    );

    await client.query("COMMIT");

    res.json({ message: "✏️ تم تعديل الفاتورة بنجاح" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error in updateBuyInvoice:", err);
    res.status(500).json({ message: "حدث خطأ أثناء تعديل الفاتورة" });
  } finally {
    client.release();
  }
}

export async function deleteBuyInvoice(req, res) {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const { id } = req.params;

    // 1️⃣ جلب الفاتورة
    const invRes = await client.query(
      `SELECT * FROM "buy_invoice" WHERE buy_invoice_id = $1`,
      [id]
    );

    if (invRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "❌ الفاتورة غير موجودة" });
    }

    const inv = invRes.rows[0];
    const totalAfterDiscount = inv.invoice_price_total - (inv.discount || 0);

    // // 2️⃣ إعادة المبلغ للصندوق
    // if (inv.money_type === "Dollar") {
    //   await client.query(
    //     `UPDATE "Funds"
    //      SET fund_account_D = fund_account_D + $1
    //      WHERE fund_id = $2`,
    //     [totalAfterDiscount, inv.fund_id]
    //   );
    // } else {
    //   await client.query(
    //     `UPDATE "Funds"
    //      SET fund_account_SP = fund_account_SP + $1
    //      WHERE fund_id = $2`,
    //     [totalAfterDiscount, inv.fund_id]
    //   );
    // }

    // 3️⃣ تعديل حساب العميل
    const clientRes = await client.query(
      `SELECT "client_account_D", "client_account_SP" 
       FROM "Client"
       WHERE client_id = $1`,
      [inv.saller_id]
    );

    const acc = clientRes.rows[0];

    const newD =
      inv.money_type === "Dollar"
        ? acc.client_account_D + totalAfterDiscount
        : acc.client_account_D;

    const newSP =
      inv.money_type === "SP"
        ? acc.client_account_SP + totalAfterDiscount
        : acc.client_account_SP;

    await client.query(
      `UPDATE "Client"
       SET "client_account_D"=$1, "client_account_SP"=$2
       WHERE client_id=$3`,
      [newD, newSP, inv.invoice_client_id]
    );

    // // 4️⃣ حذف سجل transaciton
    // await client.query(
    //   `DELETE FROM "Transaction"
    //    WHERE to_client_account_id=$1 AND transaction_type='فاتورة شراء'`,
    //   [inv.invoice_client_id]
    // );

    // 5️⃣ حذف الفاتورة
    await client.query(
      `DELETE FROM "buy_invoice" WHERE buy_invoice_id=$1`,
      [id]
    );

    await client.query("COMMIT");

    res.json({ message: "🗑️ تم حذف الفاتورة بنجاح" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error in deleteBuyInvoice:", err);
    res.status(500).json({ message: "حدث خطأ أثناء حذف الفاتورة" });
  } finally {
    client.release();
  }
}
