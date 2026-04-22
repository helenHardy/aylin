-- SCHEMA FOR WHOLESALE WOOL SYSTEM (LANAS MAYORISTA)

-- 1. EXTENSIONS & SETUP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES & ROLES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'seller');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'seller',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WAREHOUSES
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    color TEXT,
    image_url TEXT,
    cost_price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, brand, model, color)
);

-- 5. PRICE TIERS
CREATE TABLE IF NOT EXISTS price_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL,
    price_per_unit DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, min_quantity)
);

-- 6. INVENTORY
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- 7. CUSTOMERS & SUPPLIERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    current_balance DECIMAL(10,2) DEFAULT 0, -- Positive means they owe us
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    current_balance DECIMAL(10,2) DEFAULT 0, -- Positive means we owe them
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. SALES & ORDERS
DO $$ BEGIN
    CREATE TYPE sale_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_type AS ENUM ('cash', 'qr', 'mixed', 'credit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    seller_id UUID REFERENCES profiles(id),
    warehouse_id UUID REFERENCES warehouses(id),
    total_amount DECIMAL(10,2) NOT NULL,
    status sale_status DEFAULT 'pending',
    payment_method payment_type DEFAULT 'cash',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id)
);

-- 9. PAYMENTS (To support mixed payments)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    amount_cash DECIMAL(10,2) DEFAULT 0,
    amount_qr DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. DEBT LEDGER (Audit trail for balance changes)
CREATE TABLE IF NOT EXISTS debt_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    supplier_id UUID REFERENCES suppliers(id),
    amount DECIMAL(10,2) NOT NULL, -- Positive for increase, Negative for decrease
    type TEXT NOT NULL, -- 'sale', 'payment', 'purchase', 'return'
    reference_id UUID, -- sale_id or payment_id
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (customer_id IS NOT NULL OR supplier_id IS NOT NULL)
);

-- 11. STOCK TRANSFERS
CREATE TABLE IF NOT EXISTS stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_warehouse_id UUID REFERENCES warehouses(id),
    to_warehouse_id UUID REFERENCES warehouses(id),
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TRIGGERS & FUNCTIONS

-- CLEANUP: Remove legacy triggers that might cause double-up calculations
DROP TRIGGER IF EXISTS trg_update_customer_balance ON debt_ledger;
DROP TRIGGER IF EXISTS trg_debt_ledger_update ON debt_ledger;
DROP TRIGGER IF EXISTS handle_payment_customer_balance ON payments;
DROP TRIGGER IF EXISTS trg_update_entity_balance ON debt_ledger;

-- Function to update customer/supplier balance automatically
CREATE OR REPLACE FUNCTION update_entity_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Update customer if present
        IF (NEW.customer_id IS NOT NULL) THEN
            UPDATE customers 
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.customer_id;
        END IF;
        
        -- Update supplier if present
        IF (NEW.supplier_id IS NOT NULL) THEN
            UPDATE suppliers 
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.supplier_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Revert customer if present
        IF (OLD.customer_id IS NOT NULL) THEN
            UPDATE customers 
            SET current_balance = current_balance - OLD.amount
            WHERE id = OLD.customer_id;
        END IF;
        
        -- Revert supplier if present
        IF (OLD.supplier_id IS NOT NULL) THEN
            UPDATE suppliers 
            SET current_balance = current_balance - OLD.amount
            WHERE id = OLD.supplier_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_entity_balance ON debt_ledger;
CREATE TRIGGER trg_update_entity_balance
AFTER INSERT OR DELETE ON debt_ledger
FOR EACH ROW
EXECUTE FUNCTION update_entity_balance();

-- Function to handle inventory changes on sale
CREATE OR REPLACE FUNCTION handle_sale_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- Subtract from inventory using the ITEM'S warehouse_id
    INSERT INTO inventory (product_id, warehouse_id, quantity)
    VALUES (NEW.product_id, NEW.warehouse_id, -NEW.quantity)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_sale_inventory ON sale_items;
CREATE TRIGGER trg_handle_sale_inventory
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION handle_sale_inventory();

-- Trigger to handle inventory ROLLBACK on delete sale item
CREATE OR REPLACE FUNCTION rollback_sale_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- Add back to inventory (rollback) using the ITEM'S warehouse_id
    INSERT INTO inventory (product_id, warehouse_id, quantity)
    VALUES (OLD.product_id, OLD.warehouse_id, OLD.quantity)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rollback_sale_inventory ON sale_items;
CREATE TRIGGER trg_rollback_sale_inventory
BEFORE DELETE ON sale_items
FOR EACH ROW
EXECUTE FUNCTION rollback_sale_inventory();

-- 13. STORAGE SETUP (Optional if done via UI)
-- Note: Run these in the SQL Editor if storage extensions are enabled.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Cleaning existing policies to avoid errors
DROP POLICY IF EXISTS "Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

CREATE POLICY "Public Read" ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- 14. AUTH TRIGGERS (Automate profile creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Nuevo Usuario'), 
    'seller'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. PROFILES RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper function for admin check (Non-recursive)
CREATE OR REPLACE FUNCTION public.soy_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can do everything" ON profiles;
CREATE POLICY "Admins can do everything" ON profiles
  FOR ALL USING (public.soy_admin());

-- 16. PRODUCT METADATA
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, name)
);

-- 17. RLS POLICIES FOR PRODUCTS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on products" ON products;
CREATE POLICY "Allow public read on products" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on categories" ON categories;
CREATE POLICY "Allow public read on categories" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on brands" ON brands;
CREATE POLICY "Allow public read on brands" ON brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on models" ON product_models;
CREATE POLICY "Allow public read on models" ON product_models FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read on tiers" ON price_tiers;
CREATE POLICY "Allow public read on tiers" ON price_tiers FOR SELECT USING (true);

-- 17. PURCHASES
DO $$ BEGIN
    CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id),
    warehouse_id UUID REFERENCES warehouses(id),
    total_amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    payment_status TEXT DEFAULT 'paid', -- 'paid' or 'credit'
    status purchase_status DEFAULT 'completed',
    purchase_number SERIAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id)
);

-- Trigger to handle inventory INCREASE on purchase
CREATE OR REPLACE FUNCTION handle_purchase_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- Add to inventory using the ITEM'S warehouse_id
    INSERT INTO inventory (product_id, warehouse_id, quantity)
    VALUES (NEW.product_id, NEW.warehouse_id, NEW.quantity)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_purchase_inventory ON purchase_items;
CREATE TRIGGER trg_handle_purchase_inventory
AFTER INSERT ON purchase_items
FOR EACH ROW
EXECUTE FUNCTION handle_purchase_inventory();

-- Trigger to handle inventory ROLLBACK on delete purchase item
CREATE OR REPLACE FUNCTION rollback_purchase_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- Subtract from inventory (rollback) using the ITEM'S warehouse_id
    UPDATE inventory 
    SET quantity = inventory.quantity - OLD.quantity
    WHERE product_id = OLD.product_id AND warehouse_id = OLD.warehouse_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rollback_purchase_inventory ON purchase_items;
CREATE TRIGGER trg_rollback_purchase_inventory
BEFORE DELETE ON purchase_items
FOR EACH ROW
EXECUTE FUNCTION rollback_purchase_inventory();
-- Function for ATOMIC stock transfer
CREATE OR REPLACE FUNCTION transfer_stock(
    p_product_id UUID, 
    p_from_warehouse_id UUID, 
    p_to_warehouse_id UUID, 
    p_quantity INTEGER
)
RETURNS void AS $$
BEGIN
    -- 1. Validate source stock
    IF NOT EXISTS (
        SELECT 1 FROM inventory 
        WHERE product_id = p_product_id 
          AND warehouse_id = p_from_warehouse_id 
          AND quantity >= p_quantity
    ) THEN
        RAISE EXCEPTION 'Stock insuficiente en depósito de origen';
    END IF;

    -- 2. Subtract from source
    UPDATE inventory 
    SET quantity = quantity - p_quantity
    WHERE product_id = p_product_id AND warehouse_id = p_from_warehouse_id;

    -- 3. Add to destination
    INSERT INTO inventory (product_id, warehouse_id, quantity)
    VALUES (p_product_id, p_to_warehouse_id, p_quantity)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity;

    -- 4. Record transfer
    INSERT INTO stock_transfers (from_warehouse_id, to_warehouse_id, product_id, quantity)
    VALUES (p_from_warehouse_id, p_to_warehouse_id, p_product_id, p_quantity);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for manual stock adjustment
CREATE OR REPLACE FUNCTION adjust_inventory(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_quantity_change INTEGER,
    p_notes TEXT
)
RETURNS void AS $$
BEGIN
    INSERT INTO inventory (product_id, warehouse_id, quantity)
    VALUES (p_product_id, p_warehouse_id, p_quantity_change)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity;

    -- Optional: Record in transfers with NULL destination to represent adjustment
    INSERT INTO stock_transfers (from_warehouse_id, product_id, quantity)
    VALUES (p_warehouse_id, p_product_id, p_quantity_change);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
