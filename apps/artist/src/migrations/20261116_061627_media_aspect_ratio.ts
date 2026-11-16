import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_works_blocks_media_aspect_ratio" AS ENUM('5:4', '4:5', 'fit');
  CREATE TYPE "public"."enum_works_blocks_gallery_items_aspect_ratio" AS ENUM('5:4', '4:5', 'fit');
  CREATE TYPE "public"."enum__works_v_blocks_media_aspect_ratio" AS ENUM('5:4', '4:5', 'fit');
  CREATE TYPE "public"."enum__works_v_blocks_gallery_items_aspect_ratio" AS ENUM('5:4', '4:5', 'fit');
  CREATE TYPE "public"."enum_posts_blocks_media_aspect_ratio" AS ENUM('5:4', '4:5', 'fit');
  CREATE TYPE "public"."enum_posts_blocks_gallery_items_aspect_ratio" AS ENUM('5:4', '4:5', 'fit');
  CREATE TYPE "public"."enum__posts_v_blocks_media_aspect_ratio" AS ENUM('5:4', '4:5', 'fit');
  CREATE TYPE "public"."enum__posts_v_blocks_gallery_items_aspect_ratio" AS ENUM('5:4', '4:5', 'fit');
  CREATE TYPE "public"."enum_pages_blocks_media_aspect_ratio" AS ENUM('5:4', '4:5', 'fit');
  CREATE TYPE "public"."enum_pages_blocks_gallery_items_aspect_ratio" AS ENUM('5:4', '4:5', 'fit');
  CREATE TYPE "public"."enum__pages_v_blocks_media_aspect_ratio" AS ENUM('5:4', '4:5', 'fit');
  CREATE TYPE "public"."enum__pages_v_blocks_gallery_items_aspect_ratio" AS ENUM('5:4', '4:5', 'fit');
  ALTER TABLE "works_blocks_media" ADD COLUMN "aspect_ratio" "enum_works_blocks_media_aspect_ratio" DEFAULT 'fit';
  ALTER TABLE "works_blocks_gallery_items" ADD COLUMN "aspect_ratio" "enum_works_blocks_gallery_items_aspect_ratio" DEFAULT 'fit';
  ALTER TABLE "_works_v_blocks_media" ADD COLUMN "aspect_ratio" "enum__works_v_blocks_media_aspect_ratio" DEFAULT 'fit';
  ALTER TABLE "_works_v_blocks_gallery_items" ADD COLUMN "aspect_ratio" "enum__works_v_blocks_gallery_items_aspect_ratio" DEFAULT 'fit';
  ALTER TABLE "posts_blocks_media" ADD COLUMN "aspect_ratio" "enum_posts_blocks_media_aspect_ratio" DEFAULT 'fit';
  ALTER TABLE "posts_blocks_gallery_items" ADD COLUMN "aspect_ratio" "enum_posts_blocks_gallery_items_aspect_ratio" DEFAULT 'fit';
  ALTER TABLE "_posts_v_blocks_media" ADD COLUMN "aspect_ratio" "enum__posts_v_blocks_media_aspect_ratio" DEFAULT 'fit';
  ALTER TABLE "_posts_v_blocks_gallery_items" ADD COLUMN "aspect_ratio" "enum__posts_v_blocks_gallery_items_aspect_ratio" DEFAULT 'fit';
  ALTER TABLE "pages_blocks_media" ADD COLUMN "aspect_ratio" "enum_pages_blocks_media_aspect_ratio" DEFAULT 'fit';
  ALTER TABLE "pages_blocks_gallery_items" ADD COLUMN "aspect_ratio" "enum_pages_blocks_gallery_items_aspect_ratio" DEFAULT 'fit';
  ALTER TABLE "_pages_v_blocks_media" ADD COLUMN "aspect_ratio" "enum__pages_v_blocks_media_aspect_ratio" DEFAULT 'fit';
  ALTER TABLE "_pages_v_blocks_gallery_items" ADD COLUMN "aspect_ratio" "enum__pages_v_blocks_gallery_items_aspect_ratio" DEFAULT 'fit';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "works_blocks_media" DROP COLUMN "aspect_ratio";
  ALTER TABLE "works_blocks_gallery_items" DROP COLUMN "aspect_ratio";
  ALTER TABLE "_works_v_blocks_media" DROP COLUMN "aspect_ratio";
  ALTER TABLE "_works_v_blocks_gallery_items" DROP COLUMN "aspect_ratio";
  ALTER TABLE "posts_blocks_media" DROP COLUMN "aspect_ratio";
  ALTER TABLE "posts_blocks_gallery_items" DROP COLUMN "aspect_ratio";
  ALTER TABLE "_posts_v_blocks_media" DROP COLUMN "aspect_ratio";
  ALTER TABLE "_posts_v_blocks_gallery_items" DROP COLUMN "aspect_ratio";
  ALTER TABLE "pages_blocks_media" DROP COLUMN "aspect_ratio";
  ALTER TABLE "pages_blocks_gallery_items" DROP COLUMN "aspect_ratio";
  ALTER TABLE "_pages_v_blocks_media" DROP COLUMN "aspect_ratio";
  ALTER TABLE "_pages_v_blocks_gallery_items" DROP COLUMN "aspect_ratio";
  DROP TYPE "public"."enum_works_blocks_media_aspect_ratio";
  DROP TYPE "public"."enum_works_blocks_gallery_items_aspect_ratio";
  DROP TYPE "public"."enum__works_v_blocks_media_aspect_ratio";
  DROP TYPE "public"."enum__works_v_blocks_gallery_items_aspect_ratio";
  DROP TYPE "public"."enum_posts_blocks_media_aspect_ratio";
  DROP TYPE "public"."enum_posts_blocks_gallery_items_aspect_ratio";
  DROP TYPE "public"."enum__posts_v_blocks_media_aspect_ratio";
  DROP TYPE "public"."enum__posts_v_blocks_gallery_items_aspect_ratio";
  DROP TYPE "public"."enum_pages_blocks_media_aspect_ratio";
  DROP TYPE "public"."enum_pages_blocks_gallery_items_aspect_ratio";
  DROP TYPE "public"."enum__pages_v_blocks_media_aspect_ratio";
  DROP TYPE "public"."enum__pages_v_blocks_gallery_items_aspect_ratio";`)
}
