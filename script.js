// Mapboxアクセストークン
mapboxgl.accessToken = window.MAPBOX_ACCESS_TOKEN;

// 地図を初期化
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [136.62787965448547, 36.53056704162511], // 仮の初期位置
    zoom: 12
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

        // 現在地を取得
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const userCoordinates = [position.coords.longitude, position.coords.latitude];
                    console.log('現在地の座標:', userCoordinates);

                    // 地図の中心を現在地に移動
                    map.setCenter(userCoordinates);

                    // 現在地にマーカーを追加
                    new mapboxgl.Marker({ color: 'red' })
                        .setLngLat(userCoordinates)
                        .setPopup(new mapboxgl.Popup().setText("あなたの現在地"))
                        .addTo(map);

                    // 最寄の避難所を探す
                    let closestShelter = findClosestShelter(userCoordinates, shelters);
                    console.log('最寄の避難所:', closestShelter);

                    // 最寄避難所までの距離を計算
                    const distanceToClosest = calculateDistance(userCoordinates, closestShelter.coordinates);
                    const formattedDistance = distanceToClosest.toFixed(1); // 小数点第1位まで表示

                    // 最寄避難所用の特別なポップアップを作成
                    const closestShelterPopup = new mapboxgl.Popup()
                        .setHTML(`
                            <div class="info-box">
                                <h3>${closestShelter.name}</h3>
                                <p>${closestShelter.description}</p>
                                <p><strong>現在地からの距離: ${formattedDistance} km</strong></p>
                            </div>
                        `);

                    // すべての避難所にマーカーを追加
                    shelters.forEach(shelter => {
                        // 最寄りの避難所は濃い赤、それ以外は薄い赤に設定
                        const color = shelter === closestShelter ? '#FF0000' : '#FF9999';
                        
                        // 避難所までの距離を計算
                        const distance = calculateDistance(userCoordinates, shelter.coordinates);
                        const formattedDistance = distance.toFixed(1);
                        
                        // ポップアップの内容を設定
                        const popup = new mapboxgl.Popup()
                            .setHTML(`
                                <div class="info-box">
                                    <h3>${shelter.name}</h3>
                                    <p>${shelter.description}</p>
                                    <p><strong>現在地からの距離: ${formattedDistance} km</strong></p>
                                </div>
                            `);
                        
                        // マーカーを作成
                        const marker = new mapboxgl.Marker({ color })
                            .setLngLat(shelter.coordinates)
                            .setPopup(popup)
                            .addTo(map);

                        // マーカーのクリックイベントを追加
                        marker.getElement().addEventListener('click', () => {
                            // 既存の経路を削除
                            if (map.getLayer('route')) {
                                map.removeLayer('route');
                                map.removeSource('route');
                            }
                            // 新しい経路を表示
                            getRoute(userCoordinates, shelter.coordinates);
                        });
                    });
                },
                error => {
                    console.error('現在地取得に失敗しました:', error);
                    alert('現在地を取得できませんでした。位置情報のアクセスを許可してください。');
                }
            );
        } else {
            alert('このブラウザは位置情報APIをサポートしていません。');
        }
    })
    .catch(error => {
        console.error('エラーが発生しました:', error);
    });

// 最寄の避難所を計算する関数
function findClosestShelter(userCoords, shelters) {
    let closestShelter = null;
    let closestDistance = Infinity;

    shelters.forEach(shelter => {
        const distance = calculateDistance(userCoords, shelter.coordinates);
        if (distance < closestDistance) {
            closestShelter = shelter;
            closestDistance = distance;
        }
    });

    return closestShelter;
}

// 2点間の距離を計算する関数（Haversine formulaを使用）
function calculateDistance(coords1, coords2) {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;
    
    const R = 6371; // 地球の半径（キロメートル）
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // 距離（キロメートル）
}

// 最寄の避難所までの経路をMapbox Directions APIで取得する関数
function getRoute(start, end) {
    // 既存の経路を削除
    if (map.getLayer('route')) {
        map.removeLayer('route');
    }
    if (map.getSource('route')) {
        map.removeSource('route');
    }

    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.routes || data.routes.length === 0) {
                throw new Error('経路が見つかりませんでした');
            }

            const route = data.routes[0].geometry;
            
            // 経路のソースとレイヤーを追加
            if (!map.getSource('route')) {
                map.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: route
                    }
                });
            } else {
                map.getSource('route').setData({
                    type: 'Feature',
                    geometry: route
                });
            }

            if (!map.getLayer('route')) {
                map.addLayer({
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    paint: {
                        'line-color': '#FF0000',
                        'line-width': 4
                    }
                });
            }
        })
        .catch(error => {
            console.error('経路の取得に失敗しました:', error);
            // エラーメッセージをユーザーに表示
            alert('経路を表示できませんでした。');
            
            // 直線の経路を代替として表示
            showDirectLine(start, end);
        });
}

// 2点間を直線で結ぶ関数を追加
function showDirectLine(start, end) {
    if (map.getLayer('direct-line')) {
        map.removeLayer('direct-line');
    }
    if (map.getSource('direct-line')) {
        map.removeSource('direct-line');
    }

    map.addSource('direct-line', {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [start, end]
            }
        }
    });

    map.addLayer({
        id: 'direct-line',
        type: 'line',
        source: 'direct-line',
        paint: {
            'line-color': '#FF0000',
            'line-width': 2,
            'line-dasharray': [2, 2] // 破線で表示
        }
    });
}
