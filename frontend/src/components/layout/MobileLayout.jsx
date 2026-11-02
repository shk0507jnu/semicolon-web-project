import { Outlet } from 'react-router-dom';

// 피그마 프레임이 393px(모바일) 기준이라, PC에서는 가운데 393px 폭으로 보여줘.
export default function MobileLayout() {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto min-h-dvh w-full max-w-[393px] bg-canvas">
        <Outlet />
      </div>
    </div>
  );
}
