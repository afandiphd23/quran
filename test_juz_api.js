async function testApi() {
    try {
        const res1 = await fetch('https://api.alquran.cloud/v1/juz/1/en.asad');
        const d1 = await res1.json();
        console.log("Juz 1 structure:", Object.keys(d1.data));
        console.log("Ayahs count:", d1.data.ayahs.length);
        console.log("First Ayah:", d1.data.ayahs[0].text);
        console.log("First Ayah Surah:", d1.data.ayahs[0].surah.name);

        // Test word by word for the first ayah in juz 1 (Al-Fatihah 1:1) and the last (Al-Baqarah 2:141)
        // To get words for a Juz, we might need to query Quran.com by Juz instead of by Chapter.
        const res2 = await fetch('https://api.quran.com/api/v4/verses/by_juz/1?words=true&word_fields=text_uthmani,location,translation&language=en&per_page=1');
        const d2 = await res2.json();
        console.log("Verse by Juz 1 API works:", Object.keys(d2));

        // Testing recitations by Juz
        const res3 = await fetch('https://api.quran.com/api/v4/recitations/7/by_juz/1?per_page=1');
        const d3 = await res3.json();
        console.log("Audio by Juz API works:", Object.keys(d3));

    } catch (e) {
        console.error(e);
    }
}
testApi();
