-- 0007_business_doc_content.sql
-- Store the body of a business document so it can be opened and read inside the
-- portal, not just listed. Markdown text; rendered on the document's detail page.
alter table business_documents
  add column if not exists content text;
