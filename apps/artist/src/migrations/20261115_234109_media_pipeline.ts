import {getEnvironment} from '../environment';
import {importLegacyMedia} from '../media-processing/legacy';
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_media_processing_status" AS ENUM('queued', 'processing', 'ready', 'failed');
  CREATE TYPE "public"."enum_media_media_kind" AS ENUM('image', 'video');
  CREATE TYPE "public"."enum_media_generations_artifacts_role" AS ENUM('primary', 'small', 'medium', 'large', 'mp4', 'poster', 'preview');
  CREATE TYPE "public"."enum_media_generations_kind" AS ENUM('image', 'video');
  CREATE TYPE "public"."enum_media_generations_state" AS ENUM('queued', 'processing', 'ready', 'failed', 'deleted');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'processMedia');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'processMedia');
  CREATE TABLE "media_generations_artifacts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role" "enum_media_generations_artifacts_role" NOT NULL,
  	"filename" varchar NOT NULL,
  	"mime_type" varchar NOT NULL,
  	"filesize" numeric NOT NULL,
  	"width" numeric NOT NULL,
  	"height" numeric NOT NULL
  );
  
  CREATE TABLE "media_generations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"generation" varchar NOT NULL,
  	"media_id" numeric NOT NULL,
  	"source_key" varchar NOT NULL,
  	"source_name" varchar NOT NULL,
  	"source_mime_type" varchar NOT NULL,
  	"source_bytes" numeric NOT NULL,
  	"source_hash" varchar NOT NULL,
  	"kind" "enum_media_generations_kind" NOT NULL,
  	"state" "enum_media_generations_state" NOT NULL,
  	"retired_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "media" ADD COLUMN "processing_status" "enum_media_processing_status";
  ALTER TABLE "media" ADD COLUMN "processing_error" varchar;
  ALTER TABLE "media" ADD COLUMN "media_kind" "enum_media_media_kind";
  ALTER TABLE "media" ADD COLUMN "duration" numeric;
  ALTER TABLE "media" ADD COLUMN "video_webm_url" varchar;
  ALTER TABLE "media" ADD COLUMN "video_webm_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "video_webm_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "video_webm_width" numeric;
  ALTER TABLE "media" ADD COLUMN "video_webm_height" numeric;
  ALTER TABLE "media" ADD COLUMN "video_mp4_url" varchar;
  ALTER TABLE "media" ADD COLUMN "video_mp4_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "video_mp4_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "video_mp4_width" numeric;
  ALTER TABLE "media" ADD COLUMN "video_mp4_height" numeric;
  ALTER TABLE "media" ADD COLUMN "video_poster_url" varchar;
  ALTER TABLE "media" ADD COLUMN "video_poster_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "video_poster_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "video_poster_width" numeric;
  ALTER TABLE "media" ADD COLUMN "video_poster_height" numeric;
  ALTER TABLE "media" ADD COLUMN "video_preview_url" varchar;
  ALTER TABLE "media" ADD COLUMN "video_preview_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "video_preview_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "video_preview_width" numeric;
  ALTER TABLE "media" ADD COLUMN "video_preview_height" numeric;
  ALTER TABLE "media" ADD COLUMN "requested_generation" varchar;
  ALTER TABLE "media" ADD COLUMN "published_generation" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "media_generations_id" integer;
  ALTER TABLE "media_generations_artifacts" ADD CONSTRAINT "media_generations_artifacts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media_generations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_generations_artifacts_order_idx" ON "media_generations_artifacts" USING btree ("_order");
  CREATE INDEX "media_generations_artifacts_parent_id_idx" ON "media_generations_artifacts" USING btree ("_parent_id");
  CREATE INDEX "media_generations_artifacts_filename_idx" ON "media_generations_artifacts" USING btree ("filename");
  CREATE UNIQUE INDEX "media_generations_generation_idx" ON "media_generations" USING btree ("generation");
  CREATE INDEX "media_generations_media_id_idx" ON "media_generations" USING btree ("media_id");
  CREATE INDEX "media_generations_retired_at_idx" ON "media_generations" USING btree ("retired_at");
  CREATE INDEX "media_generations_updated_at_idx" ON "media_generations" USING btree ("updated_at");
  CREATE INDEX "media_generations_created_at_idx" ON "media_generations" USING btree ("created_at");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_generations_fk" FOREIGN KEY ("media_generations_id") REFERENCES "public"."media_generations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_requested_generation_idx" ON "media" USING btree ("requested_generation");
  CREATE INDEX "media_published_generation_idx" ON "media" USING btree ("published_generation");
  CREATE INDEX "payload_locked_documents_rels_media_generations_id_idx" ON "payload_locked_documents_rels" USING btree ("media_generations_id");`)
  await importLegacyMedia(payload, req, getEnvironment(process.env).mediaDir);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media_generations_artifacts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media_generations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "media_generations_artifacts" CASCADE;
  DROP TABLE "media_generations" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_generations_fk";
  
  DROP INDEX "media_requested_generation_idx";
  DROP INDEX "media_published_generation_idx";
  DROP INDEX "payload_locked_documents_rels_media_generations_id_idx";
  ALTER TABLE "media" DROP COLUMN "processing_status";
  ALTER TABLE "media" DROP COLUMN "processing_error";
  ALTER TABLE "media" DROP COLUMN "media_kind";
  ALTER TABLE "media" DROP COLUMN "duration";
  ALTER TABLE "media" DROP COLUMN "video_webm_url";
  ALTER TABLE "media" DROP COLUMN "video_webm_mime_type";
  ALTER TABLE "media" DROP COLUMN "video_webm_filesize";
  ALTER TABLE "media" DROP COLUMN "video_webm_width";
  ALTER TABLE "media" DROP COLUMN "video_webm_height";
  ALTER TABLE "media" DROP COLUMN "video_mp4_url";
  ALTER TABLE "media" DROP COLUMN "video_mp4_mime_type";
  ALTER TABLE "media" DROP COLUMN "video_mp4_filesize";
  ALTER TABLE "media" DROP COLUMN "video_mp4_width";
  ALTER TABLE "media" DROP COLUMN "video_mp4_height";
  ALTER TABLE "media" DROP COLUMN "video_poster_url";
  ALTER TABLE "media" DROP COLUMN "video_poster_mime_type";
  ALTER TABLE "media" DROP COLUMN "video_poster_filesize";
  ALTER TABLE "media" DROP COLUMN "video_poster_width";
  ALTER TABLE "media" DROP COLUMN "video_poster_height";
  ALTER TABLE "media" DROP COLUMN "video_preview_url";
  ALTER TABLE "media" DROP COLUMN "video_preview_mime_type";
  ALTER TABLE "media" DROP COLUMN "video_preview_filesize";
  ALTER TABLE "media" DROP COLUMN "video_preview_width";
  ALTER TABLE "media" DROP COLUMN "video_preview_height";
  ALTER TABLE "media" DROP COLUMN "requested_generation";
  ALTER TABLE "media" DROP COLUMN "published_generation";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "media_generations_id";
  DROP TYPE "public"."enum_media_processing_status";
  DROP TYPE "public"."enum_media_media_kind";
  DROP TYPE "public"."enum_media_generations_artifacts_role";
  DROP TYPE "public"."enum_media_generations_kind";
  DROP TYPE "public"."enum_media_generations_state";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
