/* 1회성 빌드 - watch 없이 한 번만 실행하고 종료합니다. */
const { buildAll } = require('./build-html');
buildAll();
console.log('\n✅ 빌드 완료');
