-- ============================================
-- FIX: Agregar políticas INSERT/UPDATE/DELETE 
-- a products, categories, brands, product_models, price_tiers
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ==========================================
-- PRODUCTS
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated insert products" ON products;
CREATE POLICY "Allow authenticated insert products" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update products" ON products;
CREATE POLICY "Allow authenticated update products" ON products
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete products" ON products;
CREATE POLICY "Allow authenticated delete products" ON products
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- CATEGORIES
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated insert categories" ON categories;
CREATE POLICY "Allow authenticated insert categories" ON categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update categories" ON categories;
CREATE POLICY "Allow authenticated update categories" ON categories
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete categories" ON categories;
CREATE POLICY "Allow authenticated delete categories" ON categories
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- BRANDS
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated insert brands" ON brands;
CREATE POLICY "Allow authenticated insert brands" ON brands
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update brands" ON brands;
CREATE POLICY "Allow authenticated update brands" ON brands
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete brands" ON brands;
CREATE POLICY "Allow authenticated delete brands" ON brands
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- PRODUCT_MODELS
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated insert product_models" ON product_models;
CREATE POLICY "Allow authenticated insert product_models" ON product_models
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update product_models" ON product_models;
CREATE POLICY "Allow authenticated update product_models" ON product_models
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete product_models" ON product_models;
CREATE POLICY "Allow authenticated delete product_models" ON product_models
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==========================================
-- PRICE_TIERS
-- ==========================================
DROP POLICY IF EXISTS "Allow authenticated insert price_tiers" ON price_tiers;
CREATE POLICY "Allow authenticated insert price_tiers" ON price_tiers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update price_tiers" ON price_tiers;
CREATE POLICY "Allow authenticated update price_tiers" ON price_tiers
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete price_tiers" ON price_tiers;
CREATE POLICY "Allow authenticated delete price_tiers" ON price_tiers
  FOR DELETE USING (auth.role() = 'authenticated');
