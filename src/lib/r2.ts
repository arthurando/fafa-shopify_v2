import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

export async function uploadVideoToR2(
  productCode: string,
  videoBuffer: Buffer
): Promise<string> {
  const client = getR2Client()
  const key = `${productCode}.mp4`

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: videoBuffer,
      ContentType: 'video/mp4',
    })
  )

  return key
}

export async function uploadImageToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
  bucket?: string
): Promise<void> {
  const client = getR2Client()

  await client.send(
    new PutObjectCommand({
      Bucket: bucket || process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )
}

export async function getFromR2(
  key: string,
  bucket?: string
): Promise<{ stream: Readable; contentType: string }> {
  const client = getR2Client()

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket || process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  )

  return {
    stream: response.Body as Readable,
    contentType: response.ContentType || 'application/octet-stream',
  }
}

export async function deleteFromR2(key: string, bucket?: string): Promise<void> {
  const client = getR2Client()

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket || process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  )
}
