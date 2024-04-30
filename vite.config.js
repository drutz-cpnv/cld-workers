import {defineConfig} from "vite"
import {viteSingleFile} from "vite-plugin-singlefile"

export default defineConfig({
    plugins: [viteSingleFile()],
    build: {
        rollupOptions: {
            output: {
                dir: "templates",
            },
            input: {
                app: './index.html', // default
            },
        }
    },
})