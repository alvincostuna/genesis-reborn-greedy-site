-- WEB MIGRATION 004: Reward Catalog Batch 001 — 10 verified assets
-- PREPARED ONLY. Do not apply until Migration 003 is applied and all 10 referenced assets exist and pass real-image QA.

insert into public.reader_collectible_catalog
  (collectible_key,title,image_url,asset_type,preview_url,download_url,rarity,min_episode,downloadable,active)
values
  ('RG-B001-CARD-001','Genesis Awakening','/assets/v27/rewards/genesis-awakening.webp','PICTURE_CARD','/assets/v27/rewards/genesis-awakening.webp','/assets/v27/rewards/genesis-awakening.webp','COMMON',1,true,true),
  ('RG-B001-CARD-002','Flavio & Nico — Early Party','/assets/v27/rewards/flavio-nico-early-party.webp','PICTURE_CARD','/assets/v27/rewards/flavio-nico-early-party.webp','/assets/v27/rewards/flavio-nico-early-party.webp','UNCOMMON',1,true,true),
  ('RG-B001-CARD-003','Starter Town — Safe Zone','/assets/v27/rewards/starter-town-safe-zone.webp','PICTURE_CARD','/assets/v27/rewards/starter-town-safe-zone.webp','/assets/v27/rewards/starter-town-safe-zone.webp','COMMON',1,true,true),
  ('RG-B001-CARD-004','Beginner Hunt','/assets/v27/rewards/beginner-hunt.webp','PICTURE_CARD','/assets/v27/rewards/beginner-hunt.webp','/assets/v27/rewards/beginner-hunt.webp','UNCOMMON',3,true,true),
  ('RG-B001-CHAR-001','Flavio Reyes','/assets/v27/rewards/flavio-reyes.webp','CHARACTER_PICTURE','/assets/v27/rewards/flavio-reyes.webp','/assets/v27/rewards/flavio-reyes.webp','COMMON',1,true,true),
  ('RG-B001-CHAR-002','Amihan “Maya” Villareal','/assets/v27/rewards/maya-villareal.webp','CHARACTER_PICTURE','/assets/v27/rewards/maya-villareal.webp','/assets/v27/rewards/maya-villareal.webp','RARE',1,true,true),
  ('RG-B001-CHAR-003','Nico Salazar','/assets/v27/rewards/nico-salazar.webp','CHARACTER_PICTURE','/assets/v27/rewards/nico-salazar.webp','/assets/v27/rewards/nico-salazar.webp','UNCOMMON',3,true,true),
  ('RG-B001-MON-001','Young Gnawer','/assets/v27/rewards/young-gnawer.webp','MONSTER_PICTURE','/assets/v27/rewards/young-gnawer.webp','/assets/v27/rewards/young-gnawer.webp','COMMON',3,true,true),
  ('RG-B001-DESK-001','Early GENESIS World Panorama','/assets/v27/rewards/early-genesis-world-panorama.webp','DESKTOP_WALLPAPER','/assets/v27/rewards/early-genesis-world-panorama.webp','/assets/v27/rewards/early-genesis-world-panorama.webp','RARE',0,true,true),
  ('RG-B001-DESK-002','Flavio & Early Cast','/assets/v27/rewards/flavio-early-cast-wallpaper.webp','DESKTOP_WALLPAPER','/assets/v27/rewards/flavio-early-cast-wallpaper.webp','/assets/v27/rewards/flavio-early-cast-wallpaper.webp','EPIC',1,true,true)
on conflict(collectible_key) do update
set title=excluded.title,
    image_url=excluded.image_url,
    asset_type=excluded.asset_type,
    preview_url=excluded.preview_url,
    download_url=excluded.download_url,
    rarity=excluded.rarity,
    min_episode=excluded.min_episode,
    downloadable=excluded.downloadable,
    active=excluded.active;
