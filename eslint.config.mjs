import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
// `frontend/**` is ignored on purpose: it is the Angular app, which has its own
// toolchain and does not follow the Next.js rules extended here.
const config = [...compat.extends("next/core-web-vitals", "next/typescript"), { ignores: [".next/**", "node_modules/**", "generated/**", "next-env.d.ts", "frontend/**", "public/**"] }];

export default config;
