import test from "node:test";
import assert from "node:assert/strict";
import { decodeGroupMedia, mediaDigest, MAX_MEDIA_BYTES } from "./groupMedia";
const jpeg = Buffer.from([255,216,255,224,0,10,1,2,3]);
test("valid image bytes survive transfer and have a stable digest",()=>{
  const decoded=decodeGroupMedia(jpeg.toString("base64"),"image/jpeg","image");
  assert.deepEqual(decoded,jpeg);
  assert.match(mediaDigest(decoded),/^[0-9a-f]{64}$/);
  assert.equal(mediaDigest(decoded),mediaDigest(jpeg));
});
test("HTML, SVG and mismatched file types are rejected",()=>{
  assert.throws(()=>decodeGroupMedia(Buffer.from("<script>bad</script>").toString("base64"),"image/jpeg","image"),/contents/);
  assert.throws(()=>decodeGroupMedia(jpeg.toString("base64"),"image/svg+xml","image"),/contents/);
  assert.throws(()=>decodeGroupMedia(jpeg.toString("base64"),"image/jpeg","voice"),/contents/);
});
test("invalid and noncanonical encodings do not get silently truncated",()=>{
  for(const value of ["","a===","AAAA ","####","AB=="])assert.throws(()=>decodeGroupMedia(value,"image/jpeg","image"),/encoding/);
});
test("exact decoded byte limits apply even within the same padded base64 length",()=>{
  const valid=Buffer.alloc(MAX_MEDIA_BYTES);valid.set([26,69,223,163]);
  assert.equal(decodeGroupMedia(valid.toString("base64"),"audio/webm","voice").length,MAX_MEDIA_BYTES);
  const oversized=Buffer.alloc(MAX_MEDIA_BYTES+1);oversized.set([26,69,223,163]);
  assert.equal(valid.toString("base64").length,oversized.toString("base64").length);
  assert.throws(()=>decodeGroupMedia(oversized.toString("base64"),"audio/webm","voice"),/too large/);
});
test("photos have a stricter limit than voice notes",()=>{
  const oversized=Buffer.alloc(5*1024*1024+1);oversized.set([255,216,255]);
  assert.throws(()=>decodeGroupMedia(oversized.toString("base64"),"image/jpeg","cover"),/too large/);
});
