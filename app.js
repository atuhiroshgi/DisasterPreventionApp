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
    .then(response => response.json()) // JSONデータの取得
    .then(shelters => {
        // shelterオブジェクトを確認
        console.log(shelters); // これでJSONデータが正しく読み込まれているか確認

        // マーカーを追加
        shelters.forEach(shelter => {
            // マーカーを作成
            const marker = new mapboxgl.Marker()
                .setLngLat(shelter.coordinates)
                .addTo(map);

            // マーカーをクリックした際のポップアップ
            marker.getElement().addEventListener('click', () => {
                new mapboxgl.Popup()
                    .setLngLat(shelter.coordinates)
                    .setHTML(`
                        <div class="info-box">
                            <h3>${shelter.name}</h3>
                            <p>${shelter.description}</p>
                        </div>
                    `)
                    .addTo(map);
            });
        });
    })
    .catch(error => {
        console.error('エラーが発生しました:', error); // エラーハンドリング
    });
