// Interface copy in Vietnamese and English, and the short notes shown for each place.
export const STR = {
  vi: {
    tagline: 'bên dòng Hương',
    rain: 'Mưa rào',
    rainOn: 'Đang mưa',
    times: ['Buổi sáng', 'Chiều tà', 'Lên đèn'],
    sources: 'Nguồn', photoBy: 'Ảnh', nextPhoto: 'Ảnh kế tiếp',
    labels: 'Nhãn địa danh',
    look: 'Nét mực · tả thực (V)',
    about: 'Giới thiệu & nguồn dữ liệu',
    home: 'Về góc nhìn ban đầu',
    zoomIn: 'Lại gần', zoomOut: 'Ra xa',
    langGroup: 'Ngôn ngữ',
    places: 'Địa danh',
    overview: 'Toàn cảnh',
    groups: ['Kinh thành & di sản', 'Dọc sông Hương', 'Lăng tẩm & ngoại ô', 'Làng nghề'],
    search: 'Tìm địa danh ở Huế', searchShort: 'Tìm địa danh', clear: 'Xóa', browse: 'Danh sách địa danh',
    filters: ['Tất cả', 'Di tích', 'Cầu', 'Chợ', 'Cửa thành', 'Sông nước', 'Làng nghề', 'Nơi khác'],
    noResults: 'Không tìm thấy địa danh nào khớp với «{q}».', noneOfKind: 'Không có địa danh loại này.',
    close: 'Đóng',
    hintMouse: 'Kéo để lướt · cuộn để lại gần · chuột phải để xoay',
    hintTouch: 'Một ngón để lướt · hai ngón để xoay và phóng',
    hintLabels: 'Đã ẩn nhãn — bạn nhận ra những đâu?',
    loading: 'Đang dựng thành phố từ dữ liệu OpenStreetMap…',
    attrib: '© Những người đóng góp OpenStreetMap',
    kinds: { bridge: 'Cầu', market: 'Chợ', monument: 'Di tích', area: 'Quần thể', water: 'Mặt nước', place: 'Địa điểm', island: 'Cồn', gate: 'Cửa thành', craft: 'Làng nghề' },
    aboutTitle: 'Huế, bên dòng Hương',
    aboutBody: `
      <p>Một mô hình 3D của trung tâm Huế để bạn tự do bay lượn: sông Hương, cầu Trường Tiền, chợ Đông Ba và Kinh thành với tường, hào và các cửa.</p>
      <h3>Dữ liệu</h3>
      <p>Bờ sông, hào, đường phố, đường sắt, vòng thành và {buildings} khối nhà được lấy từ <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (© những người đóng góp OpenStreetMap, giấy phép ODbL), giữ nguyên vị trí và tỉ lệ. Độ cao địa hình (các đồi phía tây và tây nam, đồi Hà Khê dưới chùa Thiên Mụ) lấy từ <a href="https://doi.org/10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn" target="_blank" rel="noopener">FABDEM v1-2</a> (Đại học Bristol / Fathom, CC BY-NC-SA 4.0) và Copernicus DEM GLO-30 (© DLR, © Airbus, do EU và ESA cung cấp), hiệu chỉnh theo các điểm đo mặt đất bằng laser của vệ tinh ICESat-2 (NASA) và độ cao đã công bố của các ngọn núi quanh Huế; chiều cao nhà lấy từ bản khảo sát công trình 3D của thành phố trên <a href="https://gishue.hue.gov.vn" target="_blank" rel="noopener">GISHue</a>, chỗ còn thiếu lấy từ <a href="https://sites.research.google/gr/open-buildings/temporal/" target="_blank" rel="noopener">Google Open Buildings 2.5D</a> (CC BY 4.0); rừng quanh các lăng và trên đồi trồng theo bản đồ lớp phủ cây của <a href="https://esa-worldcover.org" target="_blank" rel="noopener">ESA WorldCover 2021</a> (CC BY 4.0). Toàn bộ dữ liệu được đóng gói sẵn — không cần dịch vụ bản đồ trực tuyến.</p>
      <h3>Phần minh họa</h3>
      <p>Chiều cao nhà đo từ ảnh vệ tinh nên chỉ gần đúng (thường thấp hơn thực tế khoảng một phần mười); nơi không đo được thì ước lượng theo loại và diện tích. Ở những con phố OSM chưa có khối nhà, {infill} căn nhà nhỏ được vẽ thêm để giữ nhịp phố; cây xanh, sen trên hồ, thuyền, xe cộ, mái hiên, ban công và đèn cũng là minh họa. Cầu Trường Tiền, cầu Nguyễn Hoàng, Kỳ Đài, Ngọ Môn, điện Thái Hòa, tháp Phước Duyên, cổng Quốc Học, các cửa thành và lầu chuông chợ Đông Ba được dựng bằng tay trên đúng nền móng trong OSM.</p>
      <h3>Điều khiển</h3>
      <p>Kéo để di chuyển, cuộn hoặc chụm hai ngón để phóng, chuột phải (hoặc xoay hai ngón) để đổi hướng nhìn. Nhấp đúp để lại gần. La bàn đưa bạn về góc nhìn ban đầu. Phím tắt: <kbd>H</kbd> về đầu, <kbd>R</kbd> mưa, <kbd>N</kbd> đổi buổi, <kbd>L</kbd> nhãn, <kbd>/</kbd> tìm địa danh.</p>`,
    osmOnly: 'Chỉ hiện nhà có trong OSM',
  },
  en: {
    tagline: 'on the Perfume River',
    rain: 'Passing shower',
    rainOn: 'Raining',
    times: ['Morning', 'Late afternoon', 'Lights on'],
    sources: 'Sources', photoBy: 'Photo', nextPhoto: 'Next photo',
    labels: 'Place labels',
    look: 'Ink drawing · realistic (V)',
    about: 'About & data sources',
    home: 'Back to the opening view',
    zoomIn: 'Closer', zoomOut: 'Further',
    langGroup: 'Language',
    places: 'Places',
    overview: 'Whole model',
    groups: ['Citadel & heritage', 'Along the river', 'Tombs & outskirts', 'Craft villages'],
    search: 'Search places in Huế', searchShort: 'Search places', clear: 'Clear', browse: 'Browse places',
    filters: ['All', 'Monuments', 'Bridges', 'Markets', 'Gates', 'Water & islets', 'Craft villages', 'Other places'],
    noResults: 'No place matches “{q}”.', noneOfKind: 'No places of this kind.',
    close: 'Close',
    hintMouse: 'Drag to glide · scroll to come closer · right-drag to turn',
    hintTouch: 'One finger to glide · two to turn and zoom',
    hintLabels: 'Labels hidden — what can you still recognise?',
    loading: 'Raising the city from OpenStreetMap data…',
    attrib: '© OpenStreetMap contributors',
    kinds: { bridge: 'Bridge', market: 'Market', monument: 'Monument', area: 'Ensemble', water: 'Water', place: 'Place', island: 'Islet', gate: 'Citadel gate', craft: 'Craft village' },
    aboutTitle: 'Huế, on the Perfume River',
    aboutBody: `
      <p>A 3D model of central Huế to fly through: the Hương river, cầu Trường Tiền, chợ Đông Ba, and the Citadel with its walls, moat and gates.</p>
      <h3>Data</h3>
      <p>Riverbanks, moats, streets, railway, the city wall and {buildings} building footprints come from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> (© OpenStreetMap contributors, ODbL), kept in their true positions and proportions. Ground height (the hills to the west and south-west, and Hà Khê hill under chùa Thiên Mụ) comes from <a href="https://doi.org/10.5523/bris.s5hqmjcdj8yo2ibzi9b4ew3sn" target="_blank" rel="noopener">FABDEM v1-2</a> (University of Bristol / Fathom, CC BY-NC-SA 4.0) and Copernicus DEM GLO-30 (© DLR, © Airbus, provided by the EU and ESA), calibrated against ground heights measured by NASA's ICESat-2 satellite laser and the published heights of the hills round Huế; building heights from the city's own 3D building survey on <a href="https://gishue.hue.gov.vn" target="_blank" rel="noopener">GISHue</a>, and where it has none from <a href="https://sites.research.google/gr/open-buildings/temporal/" target="_blank" rel="noopener">Google Open Buildings 2.5D</a> (CC BY 4.0); the forest round the tombs and over the hills follows the tree-cover map of <a href="https://esa-worldcover.org" target="_blank" rel="noopener">ESA WorldCover 2021</a> (CC BY 4.0). Everything is bundled — no live map service is needed.</p>
      <h3>What is illustration</h3>
      <p>Building heights are measured from satellite imagery, so they are approximate (typically about a tenth low); where the measurement sees nothing they are estimated from type and footprint. Where OSM has streets but no footprints yet, {infill} small houses are drawn in to keep the grain of the streets; trees, lotus on the lakes, boats, traffic, awnings, balconies and lights are illustrative too. Cầu Trường Tiền, cầu Nguyễn Hoàng, Kỳ Đài, Ngọ Môn, Điện Thái Hòa, tháp Phước Duyên, the Quốc Học gate, the Citadel gates and the bell tower of chợ Đông Ba are modelled by hand on their OSM footprints.</p>
      <h3>Controls</h3>
      <p>Drag to move, scroll or pinch to zoom, right-drag (or twist two fingers) to turn. Double-click to come closer. The compass returns you to the opening view. Keys: <kbd>H</kbd> home, <kbd>R</kbd> rain, <kbd>N</kbd> time of day, <kbd>L</kbd> labels, <kbd>/</kbd> search.</p>`,
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
  nghenhluong: {
    vi: 'Nghênh Lương Đình — nhà thủy tạ ở bến sông trước Phu Văn Lâu, nơi vua nghỉ hóng mát trước khi xuống thuyền. Cùng Phu Văn Lâu, nó có mặt trên tờ 50.000 đồng.',
    en: 'The riverside pavilion on the landing below Phu Văn Lâu, where the emperor rested before boarding the royal boat. With Phu Văn Lâu it appears on the 50,000-đồng note.',
  },
  'gate:Cửa Kẻ Trài': {
    vi: 'Cửa Kẻ Trài (Đông Bắc Môn) — cửa đông bắc của Kinh thành. OSM chưa ghi tên cổng này; vị trí lấy theo nền cổng và cầu Cửa Trài ngay bên ngoài.',
    en: 'Cửa Kẻ Trài (Đông Bắc Môn), the Citadel’s north-east gate. OSM has the gate unnamed; it is placed from its mapped footprint and the Cửa Trài bridge just outside.',
  },
  themieu: { vi: 'Thế Miếu — nơi thờ các vua triều Nguyễn; trước sân là Hiển Lâm Các và Cửu Đỉnh.', en: 'Thế Miếu, the temple of the Nguyễn emperors; Hiển Lâm Pavilion and the Nine Dynastic Urns stand in its court.' },
  hungmieu: { vi: 'Hưng Miếu — nơi thờ thân phụ và thân mẫu vua Gia Long.', en: 'Hưng Miếu, dedicated to Emperor Gia Long’s parents.' },
  thaimieu: { vi: 'Thái Miếu — nơi thờ các chúa Nguyễn.', en: 'Thái Miếu, the temple of the Nguyễn lords.' },
  trieumieu: { vi: 'Triệu Miếu — nơi thờ Nguyễn Kim, thân phụ chúa Nguyễn Hoàng.', en: 'Triệu Miếu, dedicated to Nguyễn Kim, father of Lord Nguyễn Hoàng.' },
  dientho: { vi: 'Cung Diên Thọ — nơi ở của các Hoàng thái hậu triều Nguyễn.', en: 'Diên Thọ Residence, home of the Nguyễn queen mothers.' },
  truongsanh: { vi: 'Cung Trường Sanh — cung của các Thái hoàng thái hậu, phía sau cung Diên Thọ.', en: 'Trường Sanh Residence, for the grand queen mothers, behind Diên Thọ.' },
  duyetthi: { vi: 'Duyệt Thị Đường — nhà hát cung đình trong Tử Cấm thành, dựng năm 1826.', en: 'Duyệt Thị Đường, the royal theatre inside the Forbidden Purple City, built in 1826.' },
  kientrung: { vi: 'Điện Kiến Trung — bị phá hủy năm 1947, phục dựng xong năm 2024.', en: 'Kiến Trung Palace — destroyed in 1947, its reconstruction completed in 2024.' },
  canchanh: { vi: 'Nền điện Cần Chánh — nơi vua thiết triều thường ngày; điện bị thiêu hủy năm 1947.', en: 'The footing of Cần Chánh Palace, where the emperor held daily court; the hall burned in 1947.' },
  hiennhon: { vi: 'Cửa Hiển Nhơn — cửa phía đông của Hoàng thành.', en: 'Hiển Nhơn Gate, the east gate of the Imperial City.' },
  chuongduc: { vi: 'Cửa Chương Đức — cửa phía tây của Hoàng thành.', en: 'Chương Đức Gate, the west gate of the Imperial City.' },
  tuphuong: { vi: 'Lầu Tứ Phương Vô Sự — lầu trên Bắc Khuyết Đài, mặt bắc Hoàng thành, xây năm 1923.', en: 'Tứ Phương Vô Sự Pavilion on the northern bastion of the Imperial City, built in 1923.' },
  quoctugiam: { vi: 'Quốc Tử Giám — trường đại học của triều Nguyễn, dời vào trong Kinh thành năm 1908.', en: 'Quốc Tử Giám, the Nguyễn imperial academy, moved inside the Citadel in 1908.' },
  baotangcovat: { vi: 'Bảo tàng Cổ vật Cung đình Huế, với điện Long An bằng gỗ.', en: 'The Huế Museum of Royal Antiquities, with the timber Long An Palace.' },
  tangthulau: { vi: 'Tàng Thư Lâu — kho lưu trữ địa bạ của triều Nguyễn, xây giữa hồ Học Hải năm 1825.', en: 'Tàng Thư Lâu, the Nguyễn land-register archive, built on an islet in Học Hải Lake in 1825.' },
  xatac: { vi: 'Đàn Xã Tắc — nơi triều Nguyễn tế thần Đất và thần Lúa.', en: 'Xã Tắc Esplanade, where the Nguyễn court made offerings to the gods of Soil and Grain.' },
  mangca: { vi: 'Trấn Bình Đài, quen gọi là Mang Cá — pháo đài ở góc đông bắc Kinh thành.', en: 'Trấn Bình Đài, known as Mang Cá — the fort at the Citadel’s north-east corner.' },
  thuyquan: { vi: 'Đông Thành Thủy Quan — cống nơi Ngự Hà chảy qua mặt thành phía đông.', en: 'Đông Thành Thủy Quan, the sluice where the Ngự Hà canal passes through the east wall.' },
  dieude: { vi: 'Chùa Diệu Đế — quốc tự bên sông Đông Ba, dựng năm 1844 thời Thiệu Trị.', en: 'Diệu Đế, a national pagoda on the Đông Ba canal, founded in 1844 under Thiệu Trị.' },
  dcct: { vi: 'Nhà thờ Dòng Chúa Cứu Thế (Đức Mẹ Hằng Cứu Giúp), xây 1959–1962.', en: 'The Redemptorist church of Our Lady of Perpetual Help, built 1959–1962.' },
  tudam: { vi: 'Chùa Từ Đàm — một trong những ngôi chùa lớn của Phật giáo Huế.', en: 'Từ Đàm, one of the principal pagodas of Huế Buddhism.' },
  baoquoc: { vi: 'Chùa Báo Quốc — tổ đình trên đồi Hàm Long.', en: 'Báo Quốc Pagoda on Hàm Long hill.' },
  baotanghcm: { vi: 'Bảo tàng Hồ Chí Minh Thừa Thiên Huế, bên đường Lê Lợi.', en: 'The Hồ Chí Minh Museum of Huế, on Lê Lợi street.' },
  thuongbac: { vi: 'Thương Bạc — nơi triều Nguyễn tiếp đón sứ thần nước ngoài, bên bờ sông Hương.', en: 'Thương Bạc, where the Nguyễn court received foreign envoys, on the riverbank.' },
  hoquyen: { vi: 'Hổ Quyền — đấu trường voi và hổ của triều Nguyễn, xây năm 1830.', en: 'Hổ Quyền, the Nguyễn arena for elephant-and-tiger fights, built in 1830.' },
  diemphungthi: { vi: 'Trung tâm Nghệ thuật Điềm Phùng Thị — trưng bày tác phẩm của nhà điêu khắc Điềm Phùng Thị.', en: 'The Điềm Phùng Thị Art Centre, showing the sculptor’s work.' },
  quantuong: { vi: 'Quan Tượng Đài — đài xem thiên văn của triều Nguyễn trên mặt thành.', en: 'Quan Tượng Đài, the Nguyễn observatory on the Citadel wall.' },
  tayloc: { vi: 'Chợ Tây Lộc — chợ của khu tây Thành nội.', en: 'Tây Lộc market, serving the west of the walled city.' },
  ancuu: { vi: 'Chợ An Cựu, bên sông An Cựu.', en: 'An Cựu market, by the An Cựu river.' },
  benngu: { vi: 'Chợ Bến Ngự, bên bờ sông An Cựu.', en: 'Bến Ngự market, on the An Cựu river.' },
  thienmu: {
    vi: 'Chùa Thiên Mụ trên đồi Hà Khê bên sông Hương, khởi dựng năm 1601 thời chúa Nguyễn Hoàng. Tháp Phước Duyên bảy tầng, cao 21 m, dựng năm 1844.',
    en: 'Thiên Mụ Pagoda on Hà Khê hill above the Hương, founded in 1601 under Lord Nguyễn Hoàng. Its seven-storey Phước Duyên tower, 21 m tall, dates from 1844.',
  },
  ndchieu: { vi: 'Phố đi bộ Nguyễn Đình Chiểu — lối dạo ven sông Hương ở bờ nam, ngay chân cầu Trường Tiền.', en: 'Nguyễn Đình Chiểu walking street — the riverside promenade on the south bank, at the foot of Trường Tiền bridge.' },
  photay: { vi: 'Phố Tây — khu phố đêm của du khách quanh các đường Phạm Ngũ Lão, Chu Văn An và Võ Thị Sáu.', en: 'Phố Tây, the visitors’ night quarter around Phạm Ngũ Lão, Chu Văn An and Võ Thị Sáu streets.' },
  nguyenhoang: { vi: 'Cầu Nguyễn Hoàng — cây cầu mới bắc qua sông Hương ở phía thượng lưu, thông xe năm 2025.', en: 'Nguyễn Hoàng Bridge, the new crossing of the Hương upstream of the centre, opened in 2025.' },
  tuduc: {
    vi: 'Khiêm Lăng của vua Tự Đức (xây 1864–1867): một khu vườn thơ quanh hồ Lưu Khiêm, nơi nhà vua sống và làm việc trước khi yên nghỉ.',
    en: 'Emperor Tự Đức’s Khiêm Lăng (built 1864–67): a poet’s garden around Lưu Khiêm lake, where he lived and worked long before he was buried here.',
  },
  minhmang: {
    vi: 'Hiếu Lăng của vua Minh Mạng (1840–1843): một trục thẳng 700 m qua Đại Hồng Môn, Bi Đình, điện Sùng Ân, Minh Lâu tới Bửu Thành hình tròn, giữa hai hồ Trừng Minh và Tân Nguyệt.',
    en: 'Emperor Minh Mạng’s Hiếu Lăng (1840–43): one 700 m axis through Đại Hồng Môn, the stele pavilion, Sùng Ân temple and Minh Lâu to the round Bửu Thành, between Trừng Minh and Tân Nguyệt lakes.',
  },
  khaidinh: {
    vi: 'Ứng Lăng của vua Khải Định (1920–1931) trên sườn núi Châu Chữ: bê tông sẫm màu, bậc cấp dốc, và cung Thiên Định khảm sành sứ ở trên cùng.',
    en: 'Emperor Khải Định’s Ứng Lăng (1920–31) on the slope of Châu Chữ: dark concrete, steep flights of steps, and Thiên Định palace with its porcelain mosaics at the top.',
  },
  thieutri: {
    vi: 'Xương Lăng của vua Thiệu Trị (1848): hai trục song song — lăng và tẩm — không có la thành bao quanh.',
    en: 'Emperor Thiệu Trị’s Xương Lăng (1848): two parallel axes, tomb and temple, with no surrounding wall.',
  },
  dongkhanh: {
    vi: 'Tư Lăng của vua Đồng Khánh, xây qua bốn đời vua (1888–1917): điện thờ theo lối cổ, lăng mộ pha nét châu Âu.',
    en: 'Emperor Đồng Khánh’s Tư Lăng, built across four reigns (1888–1917): a traditional temple and a tomb with European touches.',
  },
  namgiao: {
    vi: 'Đàn Nam Giao (1806), nơi các vua Nguyễn tế Trời Đất: ba tầng đàn lộ thiên — tròn tượng Trời, vuông tượng Đất — giữa rừng thông.',
    en: 'The Nam Giao esplanade (1806), where the Nguyễn emperors made offerings to Heaven and Earth: three open terraces — round for Heaven, square for Earth — in a pine wood.',
  },
  thuytien: {
    vi: 'Hồ Thủy Tiên: công viên nước bỏ hoang giữa đồi thông, với con rồng khổng lồ quấn quanh nhà thủy cung giữa hồ.',
    en: 'Thủy Tiên lake: the abandoned water park in the pine hills, its giant dragon coiled around the aquarium in the middle of the water.',
  },
  thienan: {
    vi: 'Đan viện Thiên An (1940) của dòng Biển Đức trên đồi thông Thiên An.',
    en: 'Thiên An, the Benedictine monastery founded in 1940 on its pine-covered hill.',
  },
  vongcanh: { vi: 'Đồi Vọng Cảnh — đồi thông nhìn xuống khúc sông Hương trước điện Hòn Chén.', en: 'Vọng Cảnh hill, the pine lookout over the bend of the Hương.' },
  ngubinh: { vi: 'Núi Ngự Bình, cao 105 m — bức bình phong của Kinh thành. «Huế — sông Hương núi Ngự».', en: 'Ngự Bình, 105 m: the “royal screen” mountain that shields the Citadel from the south.' },
  golim: {
    vi: 'Cầu gỗ lim — lối đi bộ lát gỗ lim dài gần 400 m, rộng 4 m, đứng trên mặt nước dọc bờ nam sông Hương; mở cửa tháng 11 năm 2018.',
    en: 'The ironwood walkway: a boardwalk nearly 400 m long and 4 m wide standing in the water along the south bank, opened in November 2018.',
  },
  biaquochoc: {
    vi: 'Bia Quốc Học — đài tưởng niệm bên bờ sông Hương, đối diện cổng trường Quốc Học, dựng khoảng năm 1920.',
    en: 'Bia Quốc Học, the memorial on the riverbank facing the gate of Quốc Học school, built around 1920.',
  },
  thuyxuan: {
    vi: 'Làng hương Thủy Xuân, dưới chân đồi gần lăng Tự Đức: người làng nhuộm chân hương đủ màu rồi xòe thành từng bó hình hoa bên đường — góc chụp ảnh quen thuộc của du khách.',
    en: 'Thủy Xuân incense village, below the hills near Tự Đức’s tomb: the villagers dye incense sticks in bright colours and fan the bundles out like flowers along the road, a favourite photo stop.',
  },
  phuongduc: {
    vi: 'Phường Đúc — làng đúc đồng có từ thời các chúa Nguyễn. Thợ ở đây đúc Cửu Đỉnh (1835–1837) đặt trước Thế Miếu, và nay vẫn đúc chuông, tượng, đồ thờ.',
    en: 'Phường Đúc, the bronze-casting quarter since the Nguyễn lords. Its founders cast the Nine Dynastic Urns (1835–37) that stand before Thế Miếu, and still cast bells, statues and altar pieces.',
  },
  sinh: {
    vi: 'Làng Sình (Lại Ân) bên ngã ba sông Hương và sông Bồ: tranh khắc gỗ in trên giấy dó, tô màu bằng tay, vốn để thờ cúng rồi hóa đi sau lễ.',
    en: 'Sình village (Lại Ân), where the Bồ meets the Hương: woodblock prints on dó paper, coloured by hand, made for worship and burnt after the rite.',
  },
  gate: { vi: 'Một trong các cửa của Kinh thành, phía trên là vọng lâu.', en: 'One of the Citadel’s gates, with a watch pavilion on top.' },
};

// Places offered in the quick list, in the order a visitor might walk them.
// The place list, in four groups (titles in STR.groups, same order). `overview` puts the whole-model button at the
// head of that group.
export const PLACE_GROUPS = [
  { ids: ['kydai', 'ngomon', 'nghenhluong', 'kinhthanh', 'gate:Cửa Kẻ Trài', 'namgiao'] },
  { overview: true, ids: ['truongtien', 'dongba', 'biaquochoc', 'ndchieu', 'golim', 'photay', 'nguyenhoang', 'conhen', 'thienmu'] },
  { ids: ['tuduc', 'thuytien', 'khaidinh', 'minhmang'] },
  { ids: ['thuyxuan', 'phuongduc', 'sinh'] },
];
export const QUICK = PLACE_GROUPS.flatMap((g) => g.ids);

// Camera framing per place: offset from the place [east, up, south] in metres, plus where to look relative to it.
// Views sit to the south-east so the morning light falls on what you are looking at.
export const VIEWS = {
  truongtien: { off: [250, 95, -330], look: [0, 0] },
  dongba: { off: [170, 150, 250], look: [0, -10] },
  kydai: { off: [150, 120, 300], look: [0, -40] },
  nghenhluong: { off: [60, 30, 85], look: [-4, -8] },
  ndchieu: { off: [150, 70, -200], look: [-30, 10] },
  thienmu: { off: [95, 48, 120], look: [-10, -22] },
  photay: { off: [190, 120, 230], look: [0, 0] },
  nguyenhoang: { off: [330, 130, 330], look: [0, 0] },
  quochoc: { off: [-150, 95, -210], look: [0, 0] },
  'gate:Cửa Kẻ Trài': { off: [150, 110, -230], look: [0, 20] },
  ngomon: { off: [120, 95, 190], look: [0, -30] },
  thaihoa: { off: [110, 90, 170], look: [0, -20] },
  dainoi: { off: [420, 520, 560], look: [0, 0] },
  kinhthanh: { off: [900, 2500, 2200], look: [0, 150] },
  tinhtam: { off: [240, 300, 380], look: [0, 0] },
  conhen: { off: [500, 520, 850], look: [0, 0] },
  namgiao: { off: [170, 150, 260], look: [0, 0] },
  tuduc: { off: [330, 260, 380], look: [0, 0] },
  dongkhanh: { off: [230, 190, 300], look: [0, 0] },
  thieutri: { off: [330, 280, 420], look: [0, 0] },
  minhmang: { off: [480, 330, 380], look: [-60, 0] },
  khaidinh: { off: [170, 150, 240], look: [0, 0] },
  thuytien: { off: [330, 230, 300], look: [200, 150] },
  thienan: { off: [200, 150, 260], look: [0, 0] },
  ngubinh: { off: [500, 420, 700], look: [0, 0] },
  biaquochoc: { off: [-40, 30, 85], look: [0, -6] },
  golim: { off: [-90, 45, -110], look: [0, 0] },
  thuyxuan: { off: [110, 70, 150], look: [0, 0] },
  phuongduc: { off: [110, 75, 160], look: [0, 0] },
  sinh: { off: [170, 110, 230], look: [0, 0] },
  default: { off: [170, 170, 280], look: [0, 0] },
};
