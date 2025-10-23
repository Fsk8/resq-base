import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; err?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: any) {
    return { hasError: true, err };
  }
  componentDidCatch(err: any, info: any) {
    console.error("UI crash:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 16,
            color: "#b71c1c",
            background: "#ffebee",
            border: "1px solid #ffcdd2",
            borderRadius: 8,
          }}
        >
          <b>Se produjo un error en la UI</b>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.err)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
