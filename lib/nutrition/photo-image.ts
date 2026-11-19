import sharp from "sharp";
import { PHOTO_MAX_UPLOAD_BYTES } from "./photo-estimates";
export async function normalizeMealPhoto(bytes:Uint8Array):Promise<string>{
 if(bytes.length<4||bytes.length>PHOTO_MAX_UPLOAD_BYTES||bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff)throw new Error("Choose a supported meal photo");
 const image=sharp(bytes,{limitInputPixels:4_194_304,failOn:"warning",sequentialRead:true});
 const metadata=await image.metadata();
 if(metadata.format!=="jpeg"||!metadata.width||!metadata.height||metadata.width>4096||metadata.height>4096||(metadata.pages??1)>1)throw new Error("Unsupported image dimensions");
 // No withMetadata/keepMetadata: strip EXIF, GPS, names and embedded profiles before transmission.
 const output=await image.rotate().resize({width:1280,height:1280,fit:"inside",withoutEnlargement:true}).jpeg({quality:80,mozjpeg:true}).toBuffer();
 if(output.length>PHOTO_MAX_UPLOAD_BYTES)throw new Error("Photo is too large");return output.toString("base64");
}
