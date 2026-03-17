export default function handler(req, res) {
  console.log("สะกิด Vercel เรียบร้อย!");
  res.status(200).json({ success: true });
}
