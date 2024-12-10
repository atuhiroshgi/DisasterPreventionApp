// Mapboxアクセストークン
mapboxgl.accessToken = 'pk.eyJ1Ijoic2ExZDAiLCJhIjoiY20zbnk4ZzhkMHllbjJtb2c1eW5hMWp6YyJ9.qyDqF5qDRDBBGKg0vltiMw';

// 地図を初期化
const map = new mapboxgl.Map({
    container: 'map', // HTMLで地図を表示する要素のID
    style: 'mapbox://styles/mapbox/streets-v11', // 地図のスタイル
    center: [136.62787965448547, 36.53056704162511], // 初期位置（金沢工業大学）
    zoom: 12 // 初期ズームレベル
});

// JSONデータを読み込む
fetch('./shelters.json') // JSONファイルのパス
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }
        return response.json();
    })
    .then(shelters => {
        // shelterオブジェクトを確認
        console.log('避難所データ:', shelters);

        // マーカーを追加
        shelters.forEach(shelter => {
            console.log('避難所:', shelter);

            // 特殊文字をエスケープする関数
            const escapeHTML = str => str
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");

            // ポップアップを作成
            const popup = new mapboxgl.Popup().setHTML(`
                <div class="info-box">
                    <h3>${escapeHTML(shelter.name)}</h3>
                    <p>${escapeHTML(shelter.description)}</p>
                </div>
            `);

            // マーカーを作成してポップアップを設定
            new mapboxgl.Marker()
                .setLngLat(shelter.coordinates)
                .setPopup(popup) // クリック時にポップアップを表示
                .addTo(map);
        });
    })
    .catch(error => {
        console.error('エラーが発生しました:', error);
    });
