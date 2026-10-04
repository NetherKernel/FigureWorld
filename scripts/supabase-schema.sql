-- ==============================================================================
-- FIGURES WORLD — PRODUCTION SUPABASE POSTGRESQL SCHEMA MIGRATION
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'STAFF', 'ADMIN')),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    landmark VARCHAR(255),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    compliance_requirements JSONB NOT NULL DEFAULT '{"minAge": 0, "requiresIdVerification": false, "disclaimerText": "", "restrictedRegions": []}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    discount_price NUMERIC(10, 2) CHECK (discount_price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    brand VARCHAR(100) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    weight INTEGER DEFAULT 0,
    dimensions JSONB DEFAULT '{"length": 0, "width": 0, "height": 0, "unit": "cm"}'::jsonb,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    age_requirement INTEGER DEFAULT 0,
    shipping_restrictions TEXT[] DEFAULT '{}',
    rating_average NUMERIC(3, 2) DEFAULT 5.00,
    reviews_count INTEGER DEFAULT 0,
    specifications JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10, 2) NOT NULL,
    min_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    max_discount_amount NUMERIC(10, 2),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    usage_limit INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_details JSONB NOT NULL,
    shipping_address JSONB NOT NULL,
    items JSONB NOT NULL,
    pricing JSONB NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('UPI', 'COD')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'UNDER_REVIEW', 'PAID', 'FAILED', 'REFUNDED')),
    payment_ref VARCHAR(100),
    order_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    shipping_details JSONB DEFAULT '{}'::jsonb,
    requires_admin_review BOOLEAN DEFAULT FALSE,
    compliance_details JSONB DEFAULT '{}'::jsonb,
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_details JSONB NOT NULL,
    store_details JSONB NOT NULL,
    gst_details JSONB NOT NULL,
    items JSONB NOT NULL,
    pricing JSONB NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) NOT NULL,
    payment_ref VARCHAR(100),
    pdf_url VARCHAR(500),
    sent_to_customer BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. SHIPMENTS TABLE
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    courier VARCHAR(100) NOT NULL,
    tracking_number VARCHAR(100) NOT NULL,
    tracking_url VARCHAR(500),
    dispatch_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_delivery_date TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'DISPATCHED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    actor JSONB NOT NULL,
    resource JSONB NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON public.shipments(tracking_number);

-- ==============================================================================
-- INITIAL SEED: STORE CATEGORIES & DEFAULT COUPON
-- ==============================================================================
INSERT INTO public.categories (name, slug, description, display_order, is_active, is_restricted, compliance_requirements)
VALUES 
('Anime Figures', 'anime-figures', 'Scale figures and articulated models from popular anime series', 1, true, false, '{"minAge": 0, "requiresIdVerification": false, "disclaimerText": "", "restrictedRegions": []}'::jsonb),
('Collectibles', 'collectibles', 'Limited edition resin statues and collector busts', 2, true, false, '{"minAge": 0, "requiresIdVerification": false, "disclaimerText": "", "restrictedRegions": []}'::jsonb),
('Katanas & Replicas', 'katanas-replicas', 'Collector display anime swords and metal weapons. Age restricted 18+.', 3, true, true, '{"minAge": 18, "requiresIdVerification": true, "disclaimerText": "Notice: Ornamental replica sword for display purposes only. Buyer must be 18 years or older and complies with local weapons regulations.", "restrictedRegions": ["UK", "NY-NYC", "CA-SF"]}'::jsonb),
('Keychains', 'keychains', 'Acrylic, metallic and rubber anime character keychains', 4, true, false, '{"minAge": 0, "requiresIdVerification": false, "disclaimerText": "", "restrictedRegions": []}'::jsonb),
('Posters', 'posters', 'High-definition collector wall scrolls and framed art prints', 5, true, false, '{"minAge": 0, "requiresIdVerification": false, "disclaimerText": "", "restrictedRegions": []}'::jsonb),
('Manga', 'manga', 'Original Japanese and translated manga volumes and box sets', 6, true, false, '{"minAge": 0, "requiresIdVerification": false, "disclaimerText": "", "restrictedRegions": []}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_amount, start_date, end_date, is_active)
VALUES ('WELCOME10', 'Welcome 10% discount for first time collectors', 'percentage', 10.00, 500.00, NOW(), NOW() + INTERVAL '1 year', true)
ON CONFLICT (code) DO NOTHING;
