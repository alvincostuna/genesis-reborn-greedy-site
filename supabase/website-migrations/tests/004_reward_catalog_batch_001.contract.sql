-- CONTRACT TEST 004: Reward Catalog Batch 001
do $$
begin
  if (select count(*) from public.reader_collectible_catalog where collectible_key like 'RG-B001-%')<>15 then
    raise exception 'T4_BATCH_COUNT_FAIL';
  end if;

  if not exists(select 1 from public.reader_collectible_catalog where collectible_key like 'RG-B001-%' and asset_type='PICTURE_CARD') then
    raise exception 'T4_PICTURE_CARD_FAIL';
  end if;
  if not exists(select 1 from public.reader_collectible_catalog where collectible_key like 'RG-B001-%' and asset_type='CHARACTER_PICTURE') then
    raise exception 'T4_CHARACTER_FAIL';
  end if;
  if not exists(select 1 from public.reader_collectible_catalog where collectible_key like 'RG-B001-%' and asset_type='MONSTER_PICTURE') then
    raise exception 'T4_MONSTER_FAIL';
  end if;
  if not exists(select 1 from public.reader_collectible_catalog where collectible_key like 'RG-B001-%' and asset_type='DESKTOP_WALLPAPER') then
    raise exception 'T4_DESKTOP_WALLPAPER_FAIL';
  end if;
  if not exists(select 1 from public.reader_collectible_catalog where collectible_key like 'RG-B001-%' and asset_type='MOBILE_WALLPAPER') then
    raise exception 'T4_MOBILE_WALLPAPER_FAIL';
  end if;
  if exists(select 1 from public.reader_collectible_catalog where collectible_key like 'RG-B001-%' and min_episode<0) then
    raise exception 'T4_NEGATIVE_REVEAL_GATE_FAIL';
  end if;
  if exists(select 1 from public.reader_collectible_catalog where collectible_key like 'RG-B001-%' and (image_url is null or image_url='')) then
    raise exception 'T4_ASSET_PATH_FAIL';
  end if;
end $$;
