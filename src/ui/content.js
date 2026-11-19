// Interface copy in Vietnamese and English, and the short notes shown for each place.
export const STR = {
  vi: {
    tagline: 'bên dòng Hương',
    ride: 'Xuôi thuyền qua cầu',
    rideShort: 'Lên thuyền',
    rain: 'Mưa rào',
    rainOn: 'Đang mưa',
    night: 'Lên đèn',
    labels: 'Nhãn địa danh',
    about: 'Giới thiệu & nguồn dữ liệu',
    home: 'Về góc nhìn ban đầu',
    zoomIn: 'Lại gần', zoomOut: 'Ra xa',
    lang: 'English',
    places: 'Địa danh',
    close: 'Đóng',
    exitRide: 'Rời thuyền',
    hintMouse: 'Kéo để lướt · cuộn để lại gần · chuột phải để xoay',
    hintTouch: 'Một ngón để lướt · hai ngón để xoay và phóng',
    hintRide: 'Kéo để ngoảnh nhìn quanh',
    hintLabels: 'Đã ẩn nhãn — bạn nhận ra những đâu?',
    loading: 'Đang dựng thành phố từ dữ liệu OpenStreetMap…',
    attrib: '© Những người đóng góp OpenStreetMap',
    caps: ['Hạ xuống mặt sông Hương', 'Cầu Trường Tiền — sáu vài, mười hai nhịp', 'Dưới nhịp cầu', 'Ngoảnh lại bờ Bắc', 'Thành, hào, cầu và chợ — từ một góc khác'],
    kinds: { bridge: 'Cầu', market: 'Chợ', monument: 'Di tích', area: 'Quần thể', water: 'Mặt nước', place: 'Địa điểm', island: 'Cồn', gate: 'Cửa thành' },
    aboutTitle: 'Huế, bên dòng Hương',
    aboutBody: `
      <p>Một mô hình 3D của trung tâm Huế để bạn tự do bay lượn: sông Hương, cầu Trường Tiền, chợ Đông Ba và Kinh thành với tường, hào và các cửa.</p>
      <h3>Dữ liệu</h3>
      <p>Bờ sông, hào, đường phố, đường sắt, vòng thành và {buildings} khối nhà được lấy từ <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (© những người đóng góp OpenStreetMap, giấy phép ODbL), giữ nguyên vị trí và tỉ lệ. Toàn bộ dữ liệu được đóng gói sẵn — không cần dịch vụ bản đồ trực tuyến.</p>
      <h3>Phần minh họa</h3>
      <p>Chiều cao nhà phần lớn là ước lượng theo loại và diện tích. Ở những con phố OSM chưa có khối nhà, {infill} căn nhà nhỏ được vẽ thêm để giữ nhịp phố; cây xanh, thuyền rồng, đèn và dãy núi phía chân trời cũng là minh họa. Cầu Trường Tiền, Kỳ Đài, Ngọ Môn, điện Thái Hòa, các cửa thành và lầu chuông chợ Đông Ba được dựng bằng tay trên đúng nền móng trong OSM.</p>
      <h3>Điều khiển</h3>
      <p>Kéo để di chuyển, cuộn hoặc chụm hai ngón để phóng, chuột phải (hoặc xoay hai ngón) để đổi hướng nhìn. Nhấp đúp để lại gần. La bàn đưa bạn về góc nhìn ban đầu. Phím tắt: <kbd>H</kbd> về đầu, <kbd>B</kbd> lên thuyền, <kbd>R</kbd> mưa, <kbd>N</kbd> lên đèn, <kbd>L</kbd> nhãn.</p>`,
    osmOnly: 'Chỉ hiện nhà có trong OSM',
  },
  en: {
    tagline: 'on the Perfume River',
    ride: 'Ride under the bridge',
    rideShort: 'Board the boat',
    rain: 'Passing shower',
    rainOn: 'Raining',
    night: 'Lights on',
    labels: 'Place labels',
    about: 'About & data sources',
    home: 'Back to the opening view',
    zoomIn: 'Closer', zoomOut: 'Further',
    lang: 'Tiếng Việt',
    places: 'Places',
    close: 'Close',
    exitRide: 'Leave the boat',
    hintMouse: 'Drag to glide · scroll to come closer · right-drag to turn',
    hintTouch: 'One finger to glide · two to turn and zoom',
    hintRide: 'Drag to look around',
    hintLabels: 'Labels hidden — what can you still recognise?',
    loading: 'Raising the city from OpenStreetMap data…',
    attrib: '© OpenStreetMap contributors',
    caps: ['Down to the Perfume River', 'Cầu Trường Tiền — six spans, twelve arcs', 'Beneath the span', 'Turning back to the north bank', 'Wall, moat, bridge and market — from the other side'],
    kinds: { bridge: 'Bridge', market: 'Market', monument: 'Monument', area: 'Ensemble', water: 'Water', place: 'Place', island: 'Islet', gate: 'Citadel gate' },
    aboutTitle: 'Huế, on the Perfume River',
    aboutBody: `
      <p>A 3D model of central Huế to fly through: the Hương river, cầu Trường Tiền, chợ Đông Ba, and the Citadel with its walls, moat and gates.</p>
      <h3>Data</h3>
      <p>Riverbanks, moats, streets, railway, the city wall and {buildings} building footprints come from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (© OpenStreetMap contributors, ODbL), kept in their true positions and proportions. Everything is bundled — no live map service is needed.</p>
      <h3>What is illustration</h3>
      <p>Most building heights are estimates from type and footprint. Where OSM has streets but no footprints yet, {infill} small houses are drawn in to keep the grain of the streets; trees, dragon boats, lights and the ridgeline on the horizon are illustrative too. Cầu Trường Tiền, Kỳ Đài, Ngọ Môn, Điện Thái Hòa, the Citadel gates and the bell tower of chợ Đông Ba are modelled by hand on their OSM footprints.</p>
      <h3>Controls</h3>
      <p>Drag to move, scroll or pinch to zoom, right-drag (or twist two fingers) to turn. Double-click to come closer. The compass returns you to the opening view. Keys: <kbd>H</kbd> home, <kbd>B</kbd> boat, <kbd>R</kbd> rain, <kbd>N</kbd> lights, <kbd>L</kbd> labels.</p>`,
    osmOnly: 'Show only buildings mapped in OSM',
  },
};

export const NOTES = {
  truongtien: {
    vi: 'Sáu nhịp thép hình vành lược bắc qua sông Hương, hoàn thành năm 1899 thời vua Thành Thái. «Cầu Trường Tiền sáu vài mười hai nhịp».',
    en: 'Six bow-shaped steel spans across the Perfume River, completed in 1899 under Emperor Thành Thái — the silhouette people from Huế look for first.',
  },
  dongba: {
    vi: 'Chợ lớn nhất Huế, dời về bờ sông này năm 1899. Lầu chuông giữa chợ là dấu tích của ngôi chợ cũ.',
    en: 'Huế’s largest market, moved to this riverbank in 1899. The bell tower at its centre survives from the older market.',
  },
  kydai: {
    vi: 'Cột cờ của Kinh thành, dựng năm 1807 thời Gia Long: ba tầng đài gạch cao khoảng 17,5 m, nhìn thẳng ra sông.',
    en: 'The Citadel’s flag tower, first built in 1807 under Gia Long: three brick terraces about 17.5 m high, facing the river.',
  },
  ngomon: {
    vi: 'Cổng chính phía nam của Hoàng thành, xây năm 1833 thời Minh Mạng. Trên nền đài hình chữ U là lầu Ngũ Phụng.',
    en: 'Main south gate of the Imperial City, built in 1833 under Minh Mạng. The Five-Phoenix Pavilion stands on its U-shaped base.',
  },
  thaihoa: {
    vi: 'Điện Thái Hòa — nơi đặt ngai vàng và cử hành đại lễ của triều Nguyễn, khởi dựng năm 1805.',
    en: 'The throne hall of the Nguyễn emperors, first raised in 1805, where coronations and grand audiences were held.',
  },
  dainoi: {
    vi: 'Hoàng thành và Tử Cấm thành — trung tâm triều Nguyễn, có hào Kim Thủy bao quanh. Ngói hoàng lưu ly dành riêng cho vua.',
    en: 'The Imperial City and the Forbidden Purple City within it, ringed by the Kim Thủy moat. Yellow glazed tiles were reserved for the emperor.',
  },
  kinhthanh: {
    vi: 'Kinh thành Huế, khởi công năm 1805: vòng thành kiểu Vauban chu vi gần 10 km với 24 pháo đài, hào và sông đào bao bọc bốn mặt.',
    en: 'Huế Citadel, begun in 1805: a Vauban-style wall nearly 10 km around with 24 bastions, and a moat and canal on every side.',
  },
  phuvanlau: {
    vi: 'Lầu nhỏ trước Kỳ Đài, nơi niêm yết chiếu chỉ và bảng vàng khoa cử. Hình lầu in trên tờ 50.000 đồng.',
    en: 'The small pavilion in front of the flag tower where edicts and exam results were posted. It appears on the 50,000-đồng note.',
  },
  tinhtam: { vi: 'Hồ Tịnh Tâm — hồ sen ngự uyển của triều Nguyễn trong lòng Kinh thành.', en: 'Tịnh Tâm Lake, the Nguyễn court’s lotus lake inside the Citadel.' },
  phuxuan: { vi: 'Cầu Phú Xuân, xây năm 1971, ngay phía thượng lưu cầu Trường Tiền.', en: 'Phú Xuân Bridge, built in 1971, just upstream of Trường Tiền.' },
  quochoc: { vi: 'Trường Quốc Học, thành lập năm 1896 — ngôi trường màu đỏ bên đường Lê Lợi.', en: 'Quốc Học, founded in 1896 — the red school on Lê Lợi street.' },
  gahue: { vi: 'Ga Huế trên tuyến đường sắt Bắc–Nam, hoạt động từ đầu thế kỷ 20.', en: 'Huế station on the North–South railway, in use since the early 1900s.' },
  andinh: { vi: 'Cung An Định — cung riêng của vua Khải Định bên sông An Cựu.', en: 'An Định Palace, Emperor Khải Định’s private residence by the An Cựu river.' },
  conhen: {
    vi: 'Cồn Hến giữa sông Hương — «tả Thanh Long» trong phong thủy Kinh thành, và là quê của món cơm hến.',
    en: 'Cồn Hến islet — the “Azure Dragon” on the Citadel’s left in its feng shui, and the home of cơm hến, clam rice.',
  },
  daVien: { vi: 'Cồn Dã Viên — «hữu Bạch Hổ», đối lại Cồn Hến ở phía thượng lưu.', en: 'Dã Viên islet — the “White Tiger” on the right, answering Cồn Hến from upstream.' },
  bachho: { vi: 'Cầu Dã Viên vượt sông Hương, tựa lên cồn Dã Viên.', en: 'Dã Viên Bridge crosses the river by way of Dã Viên islet.' },
  giahoi: { vi: 'Cầu Gia Hội bắc qua sông Đông Ba, nối chợ với phố cổ Gia Hội.', en: 'Gia Hội Bridge over the Đông Ba canal, linking the market with the old Gia Hội quarter.' },
  vincom: { vi: 'Tòa nhà cao nhất trung tâm Huế (OSM ghi 160 m).', en: 'The tallest tower in central Huế (160 m in OSM).' },
  phucam: { vi: 'Nhà thờ chính tòa của Tổng giáo phận Huế.', en: 'The cathedral of the Archdiocese of Huế.' },
  gate: { vi: 'Một trong các cửa của Kinh thành, phía trên là vọng lâu.', en: 'One of the Citadel’s gates, with a watch pavilion on top.' },
};

// Places offered in the quick list, in the order a visitor might walk them.
export const QUICK = ['truongtien', 'dongba', 'kydai', 'ngomon', 'kinhthanh', 'tinhtam', 'conhen'];

// Camera framing per place: offset from the place [east, up, south] in metres, plus where to look relative to it.
export const VIEWS = {
  truongtien: { off: [-250, 95, 330], look: [0, 0] },
  dongba: { off: [170, 150, 250], look: [0, -10] },
  kydai: { off: [-120, 120, 300], look: [0, -40] },
  ngomon: { off: [-70, 95, 210], look: [0, -30] },
  thaihoa: { off: [-70, 90, 190], look: [0, -20] },
  dainoi: { off: [-260, 520, 640], look: [0, 0] },
  kinhthanh: { off: [-500, 2500, 2300], look: [0, 150] },
  tinhtam: { off: [-160, 300, 420], look: [0, 0] },
  conhen: { off: [-380, 520, 900], look: [0, 0] },
  default: { off: [-130, 170, 300], look: [0, 0] },
};
