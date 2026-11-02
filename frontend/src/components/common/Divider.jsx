import { FIGMA_ASSETS } from '../../assets';

// 가운데 글자가 있는 구분선 (피그마: Alternative divider)
function Line() {
  return (
    <div className="relative h-0 min-w-px flex-1">
      <div className="absolute inset-[-1px_0_0_0]">
        <img src={FIGMA_ASSETS.divider} alt="" className="block size-full max-w-none" />
      </div>
    </div>
  );
}

export default function Divider({ children }) {
  return (
    <div className="flex w-full items-center gap-3">
      <Line />
      <span className="shrink-0 text-[11px] leading-[18px] text-ink">{children}</span>
      <Line />
    </div>
  );
}
