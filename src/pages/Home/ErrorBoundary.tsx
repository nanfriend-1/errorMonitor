import { useState } from "react";

function BuggyComponent() {
  const [count, setCount] = useState(0);

  if (count === 3) {
    throw new Error("I crashed!");
  }

  return (
      <div>
        <h1>{count}</h1>
        <button onClick={() => setCount(count + 1)}>Increment</button>
      </div>
  );
}

export default BuggyComponent;
