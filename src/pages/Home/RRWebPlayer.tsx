import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import rrwebPlayer from "rrweb-player";
import "./index.css";
import { ErrorData } from "../../utils/ErrorMonitor/type";

interface Props {
  errorQueue: ErrorData[];
}

const ReplayController = ({ errorQueue }: Props) => {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0); // 当前播放片段

  const replayerRef = useRef<rrwebPlayer | null>(null); // 播放器
  const containerRef = useRef<HTMLDivElement>(null); // 容器

  // 全部录制片段数据
  const allScreenData = useMemo(
    () => errorQueue?.map((item) => item.screenData),
    [errorQueue]
  );

  // 有效的录制片段数据
  const validScreenData = useMemo(
    () => allScreenData.filter((item) => item?.length && item?.length >= 2),
    [allScreenData]
  );

  // 导航按钮
  const handlePrev = useCallback(() => {
    setCurrentSegmentIndex(currentSegmentIndex - 1);
  }, [currentSegmentIndex]);

  const handleNext = useCallback(() => {
    if (currentSegmentIndex < validScreenData?.length - 1) {
      setCurrentSegmentIndex(currentSegmentIndex + 1);
    }
  }, [currentSegmentIndex, validScreenData?.length]);

  const handlePlay = useCallback(() => {
    if (!containerRef.current || validScreenData.length === 0) {
      return;
    }

    // 每次创建前先销毁旧实例
    if (replayerRef.current) {
      replayerRef.current.pause();
      replayerRef.current = null;
      
      // 清空容器内容（重要！）
      containerRef.current.innerHTML = '';
    }

    const mergedEvents = validScreenData[currentSegmentIndex] ?? [];
    replayerRef.current = new rrwebPlayer({
      target: containerRef.current,
      props: {
        events: mergedEvents,
        width: 500,
        height: 500,
        autoPlay: false,
        showController: true,
      },
    });
  },[validScreenData, currentSegmentIndex]);

  return (
    <div className="replay-container">
      <div ref={containerRef} style={{ width: "500px", height: "500px" }} />

      <div className="operate-container">
        <div className="segment-controls">
          <button onClick={handlePrev} disabled={!currentSegmentIndex}>
            上一片段
          </button>
          <button
            onClick={handleNext}
            disabled={currentSegmentIndex >= validScreenData?.length - 1}
          >
            下一片段
          </button>
          <button onClick={handlePlay}>
            播放
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplayController;
