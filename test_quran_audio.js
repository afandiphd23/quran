async function testApi() {
    const url1 = 'https://api.quran.com/api/v4/recitations/1/by_chapter/1?per_page=5';

    try {
        const res1 = await fetch(url1);
        const d1 = await res1.json();
        console.log(JSON.stringify(d1.audio_files, null, 2));
    } catch (e) {
        console.error(e);
    }
}
testApi();
