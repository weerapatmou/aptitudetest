type Props = {
  onClose: () => void;
};

export function HowToPlay({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full rounded-2xl border border-border bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-dim hover:text-text transition font-mono text-sm"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="font-display text-lg font-semibold text-text mb-4">
          วิธีเล่น — เดินจุด (Dot Walking)
        </h2>

        <ol className="space-y-3 text-sm text-text-dim leading-relaxed">
          <li className="flex gap-3">
            <span className="font-mono text-accent font-bold shrink-0">1.</span>
            <span>
              มีวงกลม 2 ฝั่ง — <strong className="text-text">ขวา = มือขวา</strong>,{' '}
              <strong className="text-text">ซ้าย = มือซ้าย</strong> แต่ละฝั่งมีเส้นทางเชื่อมจุดจาก{' '}
              <strong className="text-text">ล่างขึ้นบน</strong>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-accent font-bold shrink-0">2.</span>
            <span>
              ต้อง <strong className="text-text">รอเสียงเคาะก่อน</strong> ถึงจะกดได้ (กดก่อนเคาะ<strong className="text-wrong">ถือว่าผิด</strong>)
              พอเคาะแล้วให้กดวงกลมถัดไปตามลำดับภายในเวลาที่ตั้งไว้ เริ่มจาก{' '}
              <strong className="text-text">ฝั่งขวาก่อน</strong> แล้วสลับ ขวา–ซ้าย–ขวา–ซ้าย ไปเรื่อย ๆ
              จังหวะเคาะตั้งได้ทั้ง คงที่ / สุ่ม / คงที่+สุ่ม
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-accent font-bold shrink-0">3.</span>
            <span>
              วง <strong className="text-text">ไม่ค้างสี</strong> — กดถูกแฟลช{' '}
              <strong className="text-correct">เขียว</strong> แวบเดียว กดผิด/ไม่โดน/ไม่ทันแฟลช{' '}
              <strong className="text-wrong">แดง</strong> แวบเดียวแล้วหาย · ต้อง{' '}
              <strong className="text-text">จำเอง</strong> ว่าจะกดอันไหนต่อ · ถ้าพลาดจะ{' '}
              <strong className="text-text">ค้างที่วงเดิม</strong> เคาะวนใหม่จนกว่าจะกดถูก
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-accent font-bold shrink-0">4.</span>
            <span>
              กดครบทั้งสองฝั่งถึงด้านบนสุด จะขึ้น <strong className="text-text">หน้าใหม่</strong>{' '}
              แล้วเริ่มจากด้านล่างอีกครั้ง วนไปเรื่อย ๆ
            </span>
          </li>
        </ol>

        <div className="mt-5 rounded-lg border border-border/50 bg-bg p-3 font-mono text-[11px] text-text-dim/70">
          <strong className="text-accent">คะแนน:</strong> เขียว = กดถูก · แดง = กดผิด/ไม่ทัน ·
          เส้นซ้ายเป็นเส้นประ เส้นขวาเป็นเส้นทึบ · เปิดโหมด "สลับฝั่ง" เพื่อสุ่มเริ่มด้วยมือซ้ายบางหน้า (ฝึกไขว่)
        </div>

        <div className="mt-3 rounded-lg border border-accent-warm/30 bg-accent-warm/5 p-3 font-mono text-[11px] text-text-dim/70">
          <strong className="text-accent-warm">🎧 กรรมการถามคำถาม:</strong> เปิดได้ในหน้าตั้งค่า —
          ระบบจะออกเสียงถาม (บวกลบ/คูณ/เวลา/ทวนชุดคำ/สะกดย้อนหลัง) ระหว่างเดินจุด ให้ตอบด้วยปากภายในเวลาที่ตั้ง
          แล้วระบบจะพูดเฉลยให้ตรวจเอง (ตั้งเวลา/ภาษา/เลือกหมวด และแก้ไขรายการคำเองได้ในหน้าตั้งค่า)
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 rounded-lg bg-accent text-bg font-mono text-xs uppercase tracking-wider hover:shadow-[0_0_20px_-4px_var(--accent)] transition"
        >
          เข้าใจแล้ว →
        </button>
      </div>
    </div>
  );
}
