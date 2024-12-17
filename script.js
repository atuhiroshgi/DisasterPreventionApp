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

// 通知管理のための設定を追加
const NOTIFICATION_CONFIG = {
    updateInterval: 300000, // 5分ごとに更新（テスト用）
    maxNotifications: 5,    // 各セクションの最大通知数
};

// 通知管理クラス
class NotificationManager {
    constructor() {
        this.toggleButton = document.getElementById('notification-toggle');
        this.content = document.querySelector('.notification-content');
        
        // トグルボタンのイベントリスナーを設定
        this.toggleButton.addEventListener('click', () => this.togglePanel());
        
        // 初期化
        this.initializeNotifications();

        // キーボードイベントリスナーを追加
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    // キーボードイベントの処理
    handleKeyPress(e) {
        switch(e.key) {
            case '1': // 地震情報
                this.addNotification('earthquake-info', 
                    '震度速報 福井県嶺北 震度4\n' +
                    '発生時刻: ' + new Date().toLocaleString('ja-JP'), 
                    false);
                break;
            
            case '2': // 大きな地震（緊急）
                this.addNotification('earthquake-info', 
                    '震度速報 福井県嶺北 震度5強\n' +
                    '発生時刻: ' + new Date().toLocaleString('ja-JP'), 
                    true);
                break;
            
            case '3': // 気象警報
                this.addNotification('weather-warning', 
                    '大雨警報 福井県嶺北地方\n' +
                    '警報種別: 土砂災害\n' +
                    '発表時刻: ' + new Date().toLocaleString('ja-JP'), 
                    true);
                break;
            
            case '4': // 気象注意報
                this.addNotification('weather-warning', 
                    '強風注意報 福井県嶺北地方\n' +
                    '予想される最大風速: 15m/s\n' +
                    '発表時刻: ' + new Date().toLocaleString('ja-JP'), 
                    false);
                break;
            
            case '5': // 津波情報
                this.addNotification('tsunami-info', 
                    '津波注意報 福井県沿岸部\n' +
                    '予想される津波の高さ: 0.5m\n' +
                    '発表時刻: ' + new Date().toLocaleString('ja-JP'), 
                    true);
                break;
        }
    }

    // 気象庁の警報・注意報JSONエンドポイント
    static WEATHER_API_ENDPOINTS = {
        warning: 'https://www.jma.go.jp/bosai/warning/data/warning/',
        // 福井県のコード: 180000
        fukui: '180000.json'
    };

    togglePanel() {
        const isVisible = this.content.style.display !== 'none';
        this.content.style.display = isVisible ? 'none' : 'block';
        this.toggleButton.textContent = isVisible ? '▼' : '▲';
    }

    // 通知を追加
    addNotification(type, message, isUrgent = false) {
        const section = document.querySelector(`#${type} .notification-messages`);
        const notification = document.createElement('div');
        notification.className = `notification-message ${isUrgent ? 'urgent' : ''}`;
        
        const timestamp = new Date().toLocaleString('ja-JP');
        notification.innerHTML = `
            <div class="notification-timestamp">${timestamp}</div>
            <div class="notification-text">${message}</div>
        `;

        section.insertBefore(notification, section.firstChild);

        // 最大数を超えた古い通知を削除
        while (section.children.length > NOTIFICATION_CONFIG.maxNotifications) {
            section.removeChild(section.lastChild);
        }
    }

    // XMLをJSON形式に変換
    async xmlToJson(xml) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, 'text/xml');
        const entries = xmlDoc.getElementsByTagName('entry');
        
        return Array.from(entries).map(entry => {
            return {
                title: entry.getElementsByTagName('title')[0]?.textContent || '',
                updated: entry.getElementsByTagName('updated')[0]?.textContent || '',
                content: entry.getElementsByTagName('content')[0]?.textContent || '',
                link: entry.getElementsByTagName('link')[0]?.getAttribute('href') || ''
            };
        });
    }

    // 気象情報を取得
    async fetchWeatherInfo(endpoint) {
        try {
            const response = await fetch(endpoint, {
                mode: 'no-cors',  // CORSポリシーを無視
                headers: {
                    'Content-Type': 'application/xml'
                }
            });
            
            // no-corsモードではレスポンスが空になるため、
            // 常にダミーデータを返すようにします
            return this.getDummyData(endpoint);
            
        } catch (error) {
            console.error('気象情報の取得エラー:', error);
            // エラー時もダミーデータを返す
            return this.getDummyData(endpoint);
        }
    }

    // テスト用のダミーデータを生成
    getDummyData(endpoint) {
        const currentTime = new Date().toISOString();
        
        if (endpoint.includes('eqvol')) {
            return [
                {
                    title: '震度速報 福井県嶺北 震度4',
                    updated: currentTime,
                    content: '福井県嶺北地方で震度4を観測する地震がありました。\n' +
                            '発生時刻: 2024年3月15日 14時30分頃\n' +
                            '震源地: 福井県嶺北\n' +
                            '最大震度: 4'
                },
                {
                    title: '津波注意報 福井県沿岸部',
                    updated: currentTime,
                    content: '福井県沿岸部に津波注意報が発表されました。\n' +
                            '予想される津波の高さ: 0.5m\n' +
                            '第一波到達予想時刻: 15時00分頃'
                }
            ];
        } else {
            return [
                {
                    title: '大雨警報 福井県嶺北地方',
                    updated: currentTime,
                    content: '福井県嶺北地方に大雨警報が発表されました。\n' +
                            '警報種別: 大雨（土砂災害）\n' +
                            '発表時刻: 2024年3月15日 13時00分\n' +
                            '予想される雨量: 時間雨量 50mm'
                },
                {
                    title: '強風注意報 福井県嶺北地方',
                    updated: currentTime,
                    content: '福井県嶺北地方に強風注意報が発表されました。\n' +
                            '予想される最大風速: 15m/s'
                }
            ];
        }
    }

    // 通知の初期化
    initializeNotifications() {
        // 初期データを表示
        this.updateNotifications();
        
        // 定期的な更新を開始
        this.startPeriodicUpdate();
    }

    // 定期更新の開始
    startPeriodicUpdate() {
        setInterval(() => {
            this.updateNotifications();
        }, NOTIFICATION_CONFIG.updateInterval);
    }

    // 通知の更新
    async updateNotifications() {
        try {
            const warningData = await this.fetchWarningData();
            this.processWarningData(warningData);
        } catch (error) {
            console.error('通知の更新に失敗しました:', error);
            // エラー時はダミーデータを表示
            this.addNotification('earthquake-info', '震度速報 福井県嶺北 震度4');
            this.addNotification('weather-warning', '大雨警報 福井県嶺北地方', true);
        }
    }

    // 地震情報の緊急度判定
    isUrgentEarthquake(entry) {
        const title = entry.title.toLowerCase();
        return title.includes('震度5') || title.includes('震度6') || title.includes('震度7');
    }

    // 気象警報の緊急度判定
    isUrgentWeather(entry) {
        const title = entry.title.toLowerCase();
        return title.includes('警報') || title.includes('特別警報');
    }

    async fetchWarningData() {
        try {
            const response = await fetch(NotificationManager.WEATHER_API_ENDPOINTS.warning + 
                                      NotificationManager.WEATHER_API_ENDPOINTS.fukui);
            if (!response.ok) throw new Error('警報データの取得に失敗しました');
            return await response.json();
        } catch (error) {
            console.error('警報データの取得エラー:', error);
            throw error;
        }
    }

    // 警報データを解析して通知を作成
    processWarningData(data) {
        const areaData = data.areaTypes[1].areas;
        areaData.forEach(area => {
            const warnings = [];
            
            // 警報の処理
            if (area.warnings) {
                area.warnings.forEach(warning => {
                    if (warning.status === "発表") {
                        const message = `${area.area.name}に${warning.name}が発表されています`;
                        this.addNotification('weather-warning', message, true);
                    }
                });
            }

            // 注意報の処理
            if (area.advisories) {
                area.advisories.forEach(advisory => {
                    if (advisory.status === "発表") {
                        const message = `${area.area.name}に${advisory.name}が発表されています`;
                        this.addNotification('weather-warning', message, false);
                    }
                });
            }
        });
    }
}

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
                        'line-color': MAP_CONFIG.colors.routeLine,
                        'line-width': MAP_CONFIG.style.routeWidth
                    }
                });
            }
        })
        .catch(error => {
            console.error('経路の取得に失敗しました:', error);
            // エラーメッセージをユーザーに表示
            alert('経路を表示できませんでした。');
            
            // 直��の経路を代替として表示
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
            'line-color': MAP_CONFIG.colors.directLine,
            'line-width': MAP_CONFIG.style.directLineWidth,
            'line-dasharray': MAP_CONFIG.style.directLineDash
        }
    });
}

// 地図の初期化後に通知マネージャーを初期化
map.on('load', () => {
    const notificationManager = new NotificationManager();
});
