module.exports = {
  server: {
    baseDir: ["src", "."],   // "." 추가 → 루트의 screen-list.html도 서빙됨
  },
  files: [
    "src/assets/styles/css/*.css",
    "src/dist/**/*.html",
    "src/assets/js/*.js"
  ],
  startPath: "/guide/screen-list.html",
  port: 3000,
  open: true,
  notify: false
};
