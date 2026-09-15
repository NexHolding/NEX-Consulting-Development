-- Optional structured company and invoice-recipient details. Existing addresses remain intact.
begin;
alter table public.nc_customers
  add column legal_name text not null default '' check (length(legal_name) <= 240),
  add column legal_form text not null default '' check (length(legal_form) <= 100),
  add column registered_office text not null default '' check (length(registered_office) <= 160),
  add column representative text not null default '' check (length(representative) <= 500),
  add column street text not null default '' check (length(street) <= 160),
  add column house_number text not null default '' check (length(house_number) <= 30),
  add column address_extra text not null default '' check (length(address_extra) <= 160),
  add column postal_code text not null default '' check (length(postal_code) <= 30),
  add column city text not null default '' check (length(city) <= 160),
  add column country text not null default '' check (length(country) <= 80),
  add column contact_role text not null default '' check (length(contact_role) <= 160),
  add column website text not null default '' check (length(website) <= 300),
  add column register_number text not null default '' check (length(register_number) <= 100),
  add column register_court text not null default '' check (length(register_court) <= 200),
  add column tax_number text not null default '' check (length(tax_number) <= 80),
  add column billing_contact text not null default '' check (length(billing_contact) <= 160),
  add column buyer_reference text not null default '' check (length(buyer_reference) <= 200),
  add column e_invoice_address text not null default '' check (length(e_invoice_address) <= 200),
  add column billing_street text not null default '' check (length(billing_street) <= 160),
  add column billing_house_number text not null default '' check (length(billing_house_number) <= 30),
  add column billing_address_extra text not null default '' check (length(billing_address_extra) <= 160),
  add column billing_postal_code text not null default '' check (length(billing_postal_code) <= 30),
  add column billing_city text not null default '' check (length(billing_city) <= 160),
  add column billing_country text not null default '' check (length(billing_country) <= 80);
notify pgrst, 'reload schema';
commit;
