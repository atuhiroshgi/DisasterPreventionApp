// Mapboxアクセストークン
mapboxgl.accessToken = window.MAPBOX_ACCESS_TOKEN;

// マップの設定値
const MAP_CONFIG = {
    colors: {
        currentLocation: '#0000FF',      // 現在地のマーカー色
        closestShelter: '#FF0000',      // 最寄りの避難所のマーカー色
        otherShelters: '#FF9999',       // その他の避難所のマーカー色
        routeLine: '#FF0000',           // 経路の線の色
        directLine: '#FF0000'           // 直線経路の色
    },
    style: {
        routeWidth: 4,                  // 経路の線の太さ
        directLineWidth: 2,             // 直線経路の線の太さ
        directLineDash: [2, 2]          // 直線経路の破線パターン
    }
};

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
                    new mapboxgl.Marker({ color: MAP_CONFIG.colors.currentLocation })
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
                        // 最寄りの避難所かどうかで色を変える
                        const color = shelter === closestShelter 
                            ? MAP_CONFIG.colors.closestShelter 
                            : MAP_CONFIG.colors.otherShelters;
                        
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

            const route = data.routes[0];
            
            // 経路の表示
            if (!map.getSource('route')) {
                map.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        geometry: route.geometry
                    }
                });
            } else {
                map.getSource('route').setData({
                    type: 'Feature',
                    geometry: route.geometry
                });
            }

            if (!map.getLayer('route')) {
                map.addLayer({
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    paint: {
                        'line-color': MAP_CONFIG.colors.routeLine,
                        'line-width': MAP_CONFIG.style.routeWidth
                    }
                });
            }

            // 地図の向きと表示位置を調整
            adjustMapView(start, end);
        })
        .catch(error => {
            console.error('経路の取得に失敗しました:', error);
            alert('経路を表示できませんでした。');
            showDirectLine(start, end);
            // 直線表示の場合も地図の向きを調整
            adjustMapView(start, end);
        });
}

// 地図の向きと表示位置を調整する関数
function adjustMapView(start, end) {
    // 現在地から目的地への角度を計算
    const bearing = getBearing(start, end);
    
    // 現在地と目的地の中間点を計算
    const midPoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    
    // 2点間の距離を計算
    const distance = getDistance(start, end);
    
    // 距離に基づいてズームレベルを調整
    const zoom = calculateZoomLevel(distance);

    // 地図を回転させ、位置を調整
    map.easeTo({
        center: start, // 現在地を中心に
        bearing: bearing, // 目的地の方向に回転
        zoom: zoom,
        pitch: 50, // 3D的な見た目にする
        duration: 1000 // アニメーション時間（ミリ秒）
    });
}

// 2点間の角度を計算（度数法）
function getBearing(start, end) {
    const startLat = toRadian(start[1]);
    const startLng = toRadian(start[0]);
    const endLat = toRadian(end[1]);
    const endLng = toRadian(end[0]);

    const dLng = endLng - startLng;

    const y = Math.sin(dLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
             Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    let bearing = toDegree(Math.atan2(y, x));
    bearing = (bearing + 360) % 360; // 0-360度に正規化

    return bearing;
}

// ラジアンに変換
function toRadian(degree) {
    return degree * Math.PI / 180;
}

// 度数に変換
function toDegree(radian) {
    return radian * 180 / Math.PI;
}

// 2点間の距離を計算（キロメートル）
function getDistance(start, end) {
    const R = 6371; // 地球の半径（km）
    const lat1 = toRadian(start[1]);
    const lat2 = toRadian(end[1]);
    const dLat = toRadian(end[1] - start[1]);
    const dLon = toRadian(end[0] - start[0]);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1) * Math.cos(lat2) *
             Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 距離に基づいてズームレベルを計算
function calculateZoomLevel(distance) {
    // 距離に応じて適切なズームレベルを返す
    if (distance < 0.5) return 15;
    if (distance < 1) return 14;
    if (distance < 2) return 13;
    if (distance < 5) return 12;
    return 11;
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
            'line-color': MAP_CONFIG.colors.directLine,
            'line-width': MAP_CONFIG.style.directLineWidth,
            'line-dasharray': MAP_CONFIG.style.directLineDash
        }
    });
}
