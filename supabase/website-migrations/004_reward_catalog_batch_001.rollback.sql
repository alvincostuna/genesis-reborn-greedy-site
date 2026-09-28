-- Rollback WEB MIGRATION 004: Reward Catalog Batch 001
delete from public.reader_collectible_catalog
where collectible_key like 'RG-B001-%';
