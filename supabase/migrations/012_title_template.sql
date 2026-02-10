-- Migration 012: Product Title Template
-- Add configurable product title template with {CODE} placeholder

INSERT INTO fafa_app_settings (key, value)
VALUES ('product_title_template', '馬年賀年花【{CODE}】')
ON CONFLICT (key) DO NOTHING;
