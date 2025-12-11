import { useState } from "react";

export default function Login({ onSuccess }) {
  const [form, setForm] = useState({ user: "", pass: "" });
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.user === "test" && form.pass === "123456") {
      setError("");
      onSuccess?.();
    } else {
      setError("账号或密码不正确（测试账号：test / 123456）");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">高德应用登录</h1>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="用户名"
            value={form.user}
            onChange={(e) => setForm({ ...form, user: e.target.value })}
          />
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="密码"
            type="password"
            value={form.pass}
            onChange={(e) => setForm({ ...form, pass: e.target.value })}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded py-2"
          >
            登录
          </button>
        </form>
        <button
          className="w-full border rounded py-2"
          onClick={() => onSuccess?.()}
        >
          游客模式直接进入
        </button>
        <p className="text-xs text-gray-500 text-center">
          测试账号：test / 123456
        </p>
      </div>
    </div>
  );
}

