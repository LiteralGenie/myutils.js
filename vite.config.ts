import { resolve } from "path"
import { defineConfig } from "vite"

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            fileName: "my-lib",
            formats: ["es", "cjs"],
        },
        rollupOptions: {
            external: ["react", "react-dom"],
        },
        minify: false,
        sourcemap: true,
    },
})
