// Mapboxアクセストークン
mapboxgl.accessToken = 'pk.eyJ1Ijoic2ExZDAiLCJhIjoiY20zbnk4ZzhkMHllbjJtb2c1eW5hMWp6YyJ9.qyDqF5qDRDBBGKg0vltiMw';

// 地図を初期化
const map = new mapboxgl.Map({
    container: 'map', // HTMLで地図を表示する要素のID
    style: 'mapbox://styles/mapbox/streets-v11', // 地図のスタイル
    center: [136.62787965448547, 36.53056704162511], // 初期位置（金沢工業大学）
    zoom: 12 // 初期ズームレベル
});

// 避難所のデータ
const shelters = [
    { name: '避難所A', coordinates: [139.7007, 35.6895], description: 'ここは避難所Aです。収容人数: 300人' },
    { name: '避難所B', coordinates: [139.7107, 35.6995], description: 'ここは避難所Bです。収容人数: 150人' },
    { name: '避難所C', coordinates: [139.6907, 35.6795], description: 'ここは避難所Cです。収容人数: 200人' }
];

// JSONデータを読み込む
fetch('shelters.json') // JSONファイルのパス
    .then(response => response.json())
    .then(shelters => {
        // マーカーを追加
        shelters.forEach(shelter => {
            const marker = new mapboxgl.Marker()
                .setLngLat(shelter.coordinates)
                .addTo(map);

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
    .catch(error => console.error('エラーが発生しました:', error));
