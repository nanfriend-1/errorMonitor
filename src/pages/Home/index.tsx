import React, { useState } from "react";
import BuggyComponent from "./ErrorBoundary";
import { useErrorMonitor } from "./useErrorMonitor";
import "./index.css";
import "rrweb-player/dist/style.css";
import { message, Modal } from "antd";
import ErrorBoundary from "../../utils/ErrorMonitor/ErrorBoundary";
import { ErrorData } from "../../utils/ErrorMonitor/type";
import ReplayController from "./RRWebPlayer";

const Home: React.FC = () => {
  const moitor = useErrorMonitor();
  const [messageApi, contextHolder] = message.useMessage();

  const [open, setOpen] = useState<boolean>(false);
  const [errorQueue, setErrorQueue] = useState<ErrorData[]>([]);

  const handleClick = () => {
    if (moitor) {
      const errorQueue = moitor.getErrorQueue();
      if(errorQueue?.length){
        setOpen(true);
        setErrorQueue(errorQueue);
      }else{
        messageApi.info('暂时还没有产生错误～');
      }
    }
  };

  return (
    <>
      {contextHolder}
      <div className="home-container">
        <ErrorBoundary>
          <BuggyComponent />
        </ErrorBoundary>
        <ErrorBoundary>
          <BuggyComponent />
        </ErrorBoundary>
        <button onClick={handleClick}>查看错误</button>
      </div>
      <Modal
        title="Basic Modal"
        width={500}
        open={open}
        onOk={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        className="my-modal"
      >
        <ReplayController errorQueue={errorQueue}/>
      </Modal>
    </>
  );
};

export default Home;
