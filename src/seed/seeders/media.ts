// Fixed media seeder that uses the CURRENT project's storage URL

import { logger } from "../utils/logger";

import type { Payload } from "payload";

type Asset = {
  filename: string;
  alt: string;
  // Add folder path for organized storage
  folder?: string;
};

const ASSETS_DATA: Asset[] = [
  { filename: "logo.png", alt: "Company Logo", folder: "logos" },
  { filename: "athletic-running-pro.jpg", alt: "Athletic Running Pro Shoes", folder: "products" },
  { filename: "athletic-training-flex.jpg", alt: "Athletic Training Flex Shoes", folder: "products" },
  { filename: "featured-bestseller.jpg", alt: "Featured Bestseller Shoes", folder: "products" },
  { filename: "hero-lifestyle.png", alt: "Hero Lifestyle Image", folder: "hero" },
  { filename: "hero-running-shoes.png", alt: "Hero Running Shoes", folder: "hero" },
  { filename: "mens-dress-oxford.jpg", alt: "Men's Dress Oxford Shoes", folder: "products" },
  { filename: "mens-sneaker-urban.jpg", alt: "Men's Urban Sneakers", folder: "products" },
  { filename: "womens-flat-comfort.jpg", alt: "Women's Comfort Flats", folder: "products" },
  { filename: "womens-heel-elegant.jpg", alt: "Women's Elegant Heels", folder: "products" },
  // Add the Amazon image if it exists
  { filename: "71mzbK3ZWbL._AC_SY695_.jpg", alt: "Product Image", folder: "products" },
];

/**
 * Gets the current project's Supabase URL from environment variables
 */
function getStorageBaseUrl(): string {
  // Option 1: Get from Supabase URL environment variable
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (supabaseUrl) {
    // Extract project ref from URL: https://[project-ref].supabase.co
    const regex = /https:\/\/([^.]+)\.supabase\.co/;
    const match = regex.exec(supabaseUrl);
    if (match) {
      const projectRef = match[1];
      return `https://${projectRef}.supabase.co/storage/v1/object/public/media`;
    }
  }

  // Option 2: Get from S3 endpoint if configured
  const s3Endpoint = process.env.S3_ENDPOINT;
  if (s3Endpoint) {
    // Convert S3 endpoint to public URL
    // From: https://[project-ref].storage.supabase.co/storage/v1/s3
    // To: https://[project-ref].supabase.co/storage/v1/object/public/media

    const regex = /https:\/\/([^.]+)\.storage\.supabase\.co/;
    const match = regex.exec(s3Endpoint);
    if (match) {
      const projectRef = match[1];
      return `https://${projectRef}.supabase.co/storage/v1/object/public/media`;
    }
  }

  // Option 3: Construct from database URL
  const databaseUrl = process.env.DATABASE_URI ?? process.env.POSTGRES_URL;
  if (databaseUrl) {
    // Extract project ref from database URL
    const regex = /postgres\.([^:]+):/;
    const match = regex.exec(databaseUrl);
    if (match) {
      const projectRef = match[1];
      return `https://${projectRef}.supabase.co/storage/v1/object/public/media`;
    }
  }

  // Fallback - this should never happen in production
  logger.warn("⚠️ Could not determine project storage URL from environment variables");
  logger.warn(
    `Available env vars: hasSupabaseUrl=${!!process.env.NEXT_PUBLIC_SUPABASE_URL}, hasS3Endpoint=${!!process.env.S3_ENDPOINT}, hasDatabaseUri=${!!process.env.DATABASE_URI}`,
  );

  throw new Error("Cannot determine storage URL - please check environment variables");
}

export async function seedMedia(payload: Payload): Promise<Record<string, { id: string }>> {
  try {
    logger.info("📸 Creating media entries for Supabase Storage files...");

    // Get the current project's storage URL dynamically
    const storageBaseUrl = getStorageBaseUrl();
    logger.info(`📍 Using storage URL: ${storageBaseUrl}`);

    const mediaAssets: Record<string, { id: string }> = {};

    for (const asset of ASSETS_DATA) {
      try {
        // Build the file path with folder structure
        const filePath = asset.folder ? `${asset.folder}/${asset.filename}` : asset.filename;
        const fileUrl = `${storageBaseUrl}/${filePath}`;

        logger.info(`📄 Creating database entry for: ${filePath}`);
        logger.info(`🔗 Testing URL: ${fileUrl}`);

        // First, verify the URL is accessible
        let finalFileUrl = fileUrl;
        try {
          const response = await fetch(fileUrl, { method: "HEAD" });
          if (!response.ok) {
            logger.warn(`⚠️ URL not accessible: ${fileUrl} (${response.status})`);
            logger.warn(`Will try without folder structure...`);

            // Fallback: try without folder structure
            const fallbackUrl = `${storageBaseUrl}/${asset.filename}`;
            const fallbackResponse = await fetch(fallbackUrl, { method: "HEAD" });
            if (!fallbackResponse.ok) {
              logger.error(
                `❌ Fallback URL also not accessible: ${fallbackUrl} (${fallbackResponse.status})`,
              );
              continue;
            } else {
              logger.info(`✅ Using fallback URL: ${fallbackUrl}`);
              finalFileUrl = fallbackUrl;
            }
          } else {
            logger.success(`✅ URL is accessible: ${fileUrl}`);
          }
        } catch (fetchError) {
          logger.error(`❌ Failed to verify URL accessibility: ${String(fetchError)}`);
          continue;
        }

        const extension = asset.filename.split(".").pop()?.toLowerCase();
        const mimeType = extension === "png" ? "image/png" : "image/jpeg";

        // Check if media already exists to avoid duplicates
        const existing = await payload.find({
          collection: "media",
          where: {
            filename: {
              equals: asset.filename,
            },
          },
          limit: 1,
        });

        if (existing.docs.length > 0) {
          logger.info(`⏭️ Media already exists: ${asset.filename}, updating URL...`);

          // Update existing media with correct URL using db approach to bypass upload system
          const _updated = await payload.update({
            collection: "media",
            id: existing.docs[0].id,
            data: {
              url: finalFileUrl,
              thumbnailURL: finalFileUrl,
              sizes: {
                thumbnail: {
                  width: 400,
                  height: 300,
                  mimeType: mimeType,
                  filesize: 50000,
                  filename: `thumb_${asset.filename}`,
                  url: finalFileUrl,
                },
              },
            },
          });

          mediaAssets[asset.filename] = { id: existing.docs[0].id };
          logger.success(`✅ Updated existing media: ${asset.filename}`);
        } else {
          // Create new media entry using db.create to bypass upload system
          const media = (await payload.db.create({
            collection: "media",
            data: {
              alt: asset.alt,
              filename: asset.filename,
              mimeType: mimeType,
              filesize: 100000, // These are placeholder values
              width: 800,
              height: 600,
              url: finalFileUrl,
              thumbnailURL: finalFileUrl,
              sizes: {
                thumbnail: {
                  width: 400,
                  height: 300,
                  mimeType: mimeType,
                  filesize: 50000,
                  filename: `thumb_${asset.filename}`,
                  url: finalFileUrl,
                },
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          })) as { id: string };

          mediaAssets[asset.filename] = { id: media.id };
          logger.success(`✅ Created media entry: ${asset.filename} → ID: ${media.id}`);
        }

        logger.info(`   🔗 Final File URL: ${finalFileUrl}`);
      } catch (error) {
        logger.error(`❌ Failed to create media entry for ${asset.filename}:`);
        logger.error(`   Error: ${String(error)}`);

        if (error && typeof error === "object") {
          console.log("Full error object:", JSON.stringify(error, null, 2));
        }
      }
    }

    const successCount = Object.keys(mediaAssets).length;
    const totalCount = ASSETS_DATA.length;

    if (successCount === totalCount) {
      logger.success(`🎉 All media entries created successfully! (${successCount}/${totalCount})`);
    } else {
      logger.warn(`⚠️  Partial success: ${successCount}/${totalCount} media entries created`);
    }

    return mediaAssets;
  } catch (error) {
    logger.error("💥 Critical error in media seeding:", error);
    throw error;
  }
}

// Optional: Function to verify files actually exist in storage
export async function verifyStorageFiles(): Promise<void> {
  const storageBaseUrl = getStorageBaseUrl();

  logger.info("🔍 Verifying storage files...");

  for (const asset of ASSETS_DATA) {
    const filePath = asset.folder ? `${asset.folder}/${asset.filename}` : asset.filename;
    const fileUrl = `${storageBaseUrl}/${filePath}`;

    try {
      // Try to fetch the file to verify it exists
      const response = await fetch(fileUrl, { method: "HEAD" });

      if (response.ok) {
        logger.success(`✅ File exists: ${filePath}`);
      } else {
        logger.warn(`⚠️ File not found: ${filePath} (${response.status})`);
      }
    } catch (error) {
      logger.error(`❌ Could not verify: ${filePath}`, error);
    }
  }
}

// import { logger } from "../utils/logger";

// import type { Payload } from "payload";

// type Asset = {
//   filename: string;
//   alt: string;
// };

// const ASSETS_DATA: Asset[] = [
//   { filename: "logo.png", alt: "Company Logo" },
//   { filename: "athletic-running-pro.jpg", alt: "Athletic Running Pro Shoes" },
//   { filename: "athletic-training-flex.jpg", alt: "Athletic Training Flex Shoes" },
//   { filename: "featured-bestseller.jpg", alt: "Featured Bestseller Shoes" },
//   { filename: "hero-lifestyle.png", alt: "Hero Lifestyle Image" },
//   { filename: "hero-running-shoes.png", alt: "Hero Running Shoes" },
//   { filename: "mens-dress-oxford.jpg", alt: "Men's Dress Oxford Shoes" },
//   { filename: "mens-sneaker-urban.jpg", alt: "Men's Urban Sneakers" },
//   { filename: "womens-flat-comfort.jpg", alt: "Women's Comfort Flats" },
//   { filename: "womens-heel-elegant.jpg", alt: "Women's Elegant Heels" },
// ];

// export async function seedMedia(payload: Payload): Promise<Record<string, { id: string }>> {
//   try {
//     logger.info("📸 Creating media entries for existing Supabase Storage files...");

//     const mediaAssets: Record<string, { id: string }> = {};

//     for (const asset of ASSETS_DATA) {
//       try {
//         logger.info(`📄 Creating database entry for: ${asset.filename}`);

//         const fileUrl = `https://qlbmivkyeijvlktgitvk.supabase.co/storage/v1/object/public/media/${asset.filename}`;

//         const extension = asset.filename.split(".").pop()?.toLowerCase();
//         const mimeType = extension === "png" ? "image/png" : "image/jpeg";

//         // This `data` object now exactly matches your original structure, but with the corrected `fileUrl`.
//         const media = (await payload.db.create({
//           collection: "media",
//           data: {
//             alt: asset.alt,
//             filename: asset.filename,
//             mimeType: mimeType,
//             filesize: 100000,
//             width: 800,
//             height: 600,
//             url: fileUrl,
//             thumbnailURL: fileUrl, // Kept your original schema field
//             sizes: {
//               thumbnail: {
//                 width: 400,
//                 height: 300,
//                 mimeType: mimeType,
//                 filesize: 50000,
//                 filename: `thumb_${asset.filename}`,
//                 url: fileUrl, // Kept this pointing to the main URL as in your original code
//               },
//             },
//             createdAt: new Date().toISOString(),
//             updatedAt: new Date().toISOString(),
//           },
//         })) as { id: string };

//         mediaAssets[asset.filename] = { id: media.id };
//         logger.success(`✅ Created media entry: ${asset.filename} → ID: ${media.id}`);
//         logger.info(`   🔗 File URL: ${fileUrl}`);
//       } catch (error) {
//         logger.error(`❌ Failed to create media entry for ${asset.filename}:`);
//         logger.error(`   Error: ${String(error)}`);

//         if (error && typeof error === "object") {
//           console.log("Full error object:", JSON.stringify(error, null, 2));
//         }
//       }
//     }

//     const successCount = Object.keys(mediaAssets).length;
//     const totalCount = ASSETS_DATA.length;

//     if (successCount === totalCount) {
//       logger.success(`🎉 All media entries created successfully! (${successCount}/${totalCount})`);
//     } else {
//       logger.warn(`⚠️  Partial success: ${successCount}/${totalCount} media entries created`);
//     }

//     return mediaAssets;
//   } catch (error) {
//     logger.error("💥 Critical error in media seeding:", error);
//     throw error;
//   }
// }
