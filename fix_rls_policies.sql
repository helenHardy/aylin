-- ============================================
-- FIX COMPLETO: Restaurar acceso a todas las tablas
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ==========================================
-- WAREHOUSES (Depósitos)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read warehouses" ON warehouses;
CREATE POLICY "Allow authenticated read warehouses" ON warehouses
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert warehouses" ON warehouses;
CREATE POLICY "Allow authenticated insert warehouses" ON warehouses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update warehouses" ON warehouses;
CREATE POLICY "Allow authenticated update warehouses" ON warehouses
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete warehouses" ON warehouses;
CREATE POLICY "Allow authenticated delete warehouses" ON warehouses
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- CUSTOMERS (Clientes)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read customers" ON customers;
CREATE POLICY "Allow authenticated read customers" ON customers
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert customers" ON customers;
CREATE POLICY "Allow authenticated insert customers" ON customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update customers" ON customers;
CREATE POLICY "Allow authenticated update customers" ON customers
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete customers" ON customers;
CREATE POLICY "Allow authenticated delete customers" ON customers
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- SALES (Ventas)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read sales" ON sales;
CREATE POLICY "Allow authenticated read sales" ON sales
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert sales" ON sales;
CREATE POLICY "Allow authenticated insert sales" ON sales
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update sales" ON sales;
CREATE POLICY "Allow authenticated update sales" ON sales
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete sales" ON sales;
CREATE POLICY "Allow authenticated delete sales" ON sales
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- SALE_ITEMS (Items de venta)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read sale_items" ON sale_items;
CREATE POLICY "Allow authenticated read sale_items" ON sale_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert sale_items" ON sale_items;
CREATE POLICY "Allow authenticated insert sale_items" ON sale_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update sale_items" ON sale_items;
CREATE POLICY "Allow authenticated update sale_items" ON sale_items
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete sale_items" ON sale_items;
CREATE POLICY "Allow authenticated delete sale_items" ON sale_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- INVENTORY (Inventario)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read inventory" ON inventory;
CREATE POLICY "Allow authenticated read inventory" ON inventory
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert inventory" ON inventory;
CREATE POLICY "Allow authenticated insert inventory" ON inventory
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update inventory" ON inventory;
CREATE POLICY "Allow authenticated update inventory" ON inventory
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete inventory" ON inventory;
CREATE POLICY "Allow authenticated delete inventory" ON inventory
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- DEBT_LEDGER (Libro de deudas)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read debt_ledger" ON debt_ledger;
CREATE POLICY "Allow authenticated read debt_ledger" ON debt_ledger
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert debt_ledger" ON debt_ledger;
CREATE POLICY "Allow authenticated insert debt_ledger" ON debt_ledger
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update debt_ledger" ON debt_ledger;
CREATE POLICY "Allow authenticated update debt_ledger" ON debt_ledger
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete debt_ledger" ON debt_ledger;
CREATE POLICY "Allow authenticated delete debt_ledger" ON debt_ledger
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- PAYMENTS (Pagos)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read payments" ON payments;
CREATE POLICY "Allow authenticated read payments" ON payments
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert payments" ON payments;
CREATE POLICY "Allow authenticated insert payments" ON payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update payments" ON payments;
CREATE POLICY "Allow authenticated update payments" ON payments
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete payments" ON payments;
CREATE POLICY "Allow authenticated delete payments" ON payments
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- PURCHASES (Compras)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read purchases" ON purchases;
CREATE POLICY "Allow authenticated read purchases" ON purchases
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert purchases" ON purchases;
CREATE POLICY "Allow authenticated insert purchases" ON purchases
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update purchases" ON purchases;
CREATE POLICY "Allow authenticated update purchases" ON purchases
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete purchases" ON purchases;
CREATE POLICY "Allow authenticated delete purchases" ON purchases
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- PURCHASE_ITEMS (Items de compra)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read purchase_items" ON purchase_items;
CREATE POLICY "Allow authenticated read purchase_items" ON purchase_items
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert purchase_items" ON purchase_items;
CREATE POLICY "Allow authenticated insert purchase_items" ON purchase_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update purchase_items" ON purchase_items;
CREATE POLICY "Allow authenticated update purchase_items" ON purchase_items
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete purchase_items" ON purchase_items;
CREATE POLICY "Allow authenticated delete purchase_items" ON purchase_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- SUPPLIERS (Proveedores)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read suppliers" ON suppliers;
CREATE POLICY "Allow authenticated read suppliers" ON suppliers
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert suppliers" ON suppliers;
CREATE POLICY "Allow authenticated insert suppliers" ON suppliers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update suppliers" ON suppliers;
CREATE POLICY "Allow authenticated update suppliers" ON suppliers
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete suppliers" ON suppliers;
CREATE POLICY "Allow authenticated delete suppliers" ON suppliers
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- STOCK_TRANSFERS (Transferencias)
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated read stock_transfers" ON stock_transfers;
CREATE POLICY "Allow authenticated read stock_transfers" ON stock_transfers
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated insert stock_transfers" ON stock_transfers;
CREATE POLICY "Allow authenticated insert stock_transfers" ON stock_transfers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update stock_transfers" ON stock_transfers;
CREATE POLICY "Allow authenticated update stock_transfers" ON stock_transfers
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete stock_transfers" ON stock_transfers;
CREATE POLICY "Allow authenticated delete stock_transfers" ON stock_transfers
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
