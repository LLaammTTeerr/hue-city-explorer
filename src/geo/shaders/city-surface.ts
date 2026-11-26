// GLSL shader chunks for Hue procedural city surfaces, wind-animated foliage, and vertex-color shading.

// Wind on instanced foliage, in object space after begin_vertex; shared by the leaves and by their shadow pass.
export const WIND = /* glsl */ `
        #if defined( HUE_FOLIAGE ) && defined( USE_INSTANCING )
        {
          // wind: the whole crown leans and recovers, leaves shiver; one direction for the whole city
          mat3 wim = mat3( instanceMatrix );
          vec3 origin = instanceMatrix[ 3 ].xyz;
          float ph = origin.x * 0.045 + origin.z * 0.06;
          float gust = sin( uTime * 1.2 + ph ) + 0.5 * sin( uTime * 2.7 + ph * 1.7 ) + 0.25 * sin( uTime * 5.3 + ph * 2.9 );
          float lift = clamp( ( transformed.y + 1.75 ) / 2.75, 0.0, 1.0 );
          vec3 windL = ( vec3( 0.78, 0.0, -0.42 ) * wim ) / vec3( dot( wim[ 0 ], wim[ 0 ] ), dot( wim[ 1 ], wim[ 1 ] ), dot( wim[ 2 ], wim[ 2 ] ) );
          transformed += windL * gust * 0.22 * lift * lift * uWind;
          transformed += normal * sin( uTime * 6.0 + position.x * 11.0 + position.z * 9.0 + ph ) * 0.012 * uWind * lift;
        }
        #endif`;

export const COMMON = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNrm;
varying float vKind;
varying float vBase;
varying float vFlood;
varying float vTreeSeed;
uniform float uGlow;
uniform float uLandY;
uniform float uWet;
uniform vec3 uSunDir;
uniform float uSunI;
uniform float uLook;
uniform float uSpring;
uniform float uAutumn;
uniform float uWinter;
float hueHash( vec2 p ) { p = fract( mod( p, 2048.0 ) * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
float hueHashI( vec2 i ) {
  uvec2 q = uvec2( ivec2( i ) ) * uvec2( 1597334673u, 3812015801u );
  uint n = ( q.x ^ q.y ) * 1597334673u;
  return float( n >> 8 ) * ( 1.0 / 16777216.0 );
}
float hueNoiseRaw( vec2 p ) {
  float fw = max( fwidth( p.x ), fwidth( p.y ) );
  if ( fw > 1.2 ) return 0.5;
  vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  float n = mix( mix( hueHashI( i ), hueHashI( i + vec2( 1.0, 0.0 ) ), f.x ), mix( hueHashI( i + vec2( 0.0, 1.0 ) ), hueHashI( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
  return mix( n, 0.5, smoothstep( 0.35, 1.2, fw ) );
}
// the drawn look lays flat washes: weathering and mottling settle most of the way to their middle tone
float hueNoise( vec2 p ) { return mix( hueNoiseRaw( p ), 0.5, uLook * 0.78 ); }
// The room behind a pane (interior mapping): p is the place in the bay (0..1 across and up), d the sight line as
// (along the wall, up, into the wall), size the bay in metres. The ray is run to the back wall, a side wall, the floor
// or the ceiling of a box as wide and tall as the bay, so the room shifts behind the glass as the camera moves.
vec3 hueRoom( vec2 p, vec3 d, vec2 size, float depth, float seed ) {
  vec3 dd = vec3( d.x / size.x, d.y / size.y, max( d.z, 0.02 ) / depth );
  dd.x = abs( dd.x ) < 1e-4 ? 1e-4 : dd.x; dd.y = abs( dd.y ) < 1e-4 ? 1e-4 : dd.y;
  vec3 t3 = vec3( ( step( 0.0, dd.x ) - p.x ) / dd.x, ( step( 0.0, dd.y ) - p.y ) / dd.y, 1.0 / dd.z );
  float t = min( t3.x, min( t3.y, t3.z ) );
  vec3 h = vec3( p, 0.0 ) + dd * t;
  vec3 wall = seed < 0.4 ? vec3( 0.66, 0.6, 0.48 ) : seed < 0.75 ? vec3( 0.56, 0.62, 0.6 ) : vec3( 0.7, 0.62, 0.56 );
  vec3 c;
  if ( t == t3.z ) {
    // back wall: a door or a cabinet, and a picture
    c = wall * 0.82;
    float door = step( abs( h.x - 0.3 - 0.4 * fract( seed * 7.3 ) ), 0.13 ) * step( h.y, 0.62 );
    c = mix( c, vec3( 0.24, 0.16, 0.11 ), door * 0.85 );
    c = mix( c, vec3( 0.75, 0.7, 0.6 ), step( abs( h.x - 0.72 + 0.4 * fract( seed * 3.1 ) ), 0.07 ) * step( abs( h.y - 0.66 ), 0.07 ) * ( 1.0 - door ) );
  } else if ( t == t3.y ) c = dd.y > 0.0 ? vec3( 0.86, 0.84, 0.78 ) : vec3( 0.34, 0.25, 0.18 ) * ( 0.85 + 0.3 * step( 0.5, fract( h.x * 7.0 ) ) );
  else c = wall * 0.62;
  return c * mix( 1.0, 0.42, clamp( h.z, 0.0, 1.0 ) );
}
`;

// Surface detail, painted per face kind (see KIND in buf.js). Everything is in world
// space and fades to its average tone once a feature shrinks below a couple of pixels,
// so the far city stays calm and the near city has something to look at.
export const SURFACE = /* glsl */ `
#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
  diffuseColor.rgb *= vColor.rgb * vColor.rgb;
#endif
vec3 hueN = normalize( vWNrm );
float hueH = vWPos.y - uLandY - vBase; // height above this building's own floor level
float hueWall = 1.0 - smoothstep( 0.25, 0.6, abs( hueN.y ) );
float hueLit = 0.0;      // window light mask, used by the emissive term
float hueGlass = 0.0;    // exposed glass, for sun glints
float hueGlaze = 0.0;    // glazed tile, for sheen
vec3 hueRib = hueN;      // tile-ribbed normal
vec2 hueCell = vec2( 0.0 );
float hueRough = 0.86;   // per-kind roughness and metalness, handed to the PBR lighting
float hueMetal = 0.0;
float hueHgt = 0.0;      // relief in metres (joints, reveals); turned into a normal at the end
vec3 hueNp = hueN;       // the normal after relief
vec3 hueRoomC = vec3( 1.0 ); // the room seen through a lit window

#ifdef HUE_FOLIAGE
  // the leaf cards (aKind 2, see PART in foliage.js) carry the atlas, a grey pattern whose mean is about 0.45 (linear):
  // bring it back to 1, so a crown shows its own colour rather than a third of it
  if ( vKind > 1.5 ) diffuseColor.rgb *= 2.2;
  // velvety maquette canopy mottling + hemisphere crown gradient (warm sunlit top → cool deep-green underside)
  float leafA = hueNoise( vWPos.xz * 1.4 + vWPos.y * 1.1 );
  float leafB = hueNoise( vWPos.xz * 4.2 - vWPos.y * 3.0 );
  float leaf = leafA * 0.65 + leafB * 0.35;
  float crownTop = smoothstep( -0.35, 0.78, hueN.y );
  diffuseColor.rgb *= ( 0.80 + 0.38 * leaf ) * mix( 0.82, 1.14, crownTop );
  // sunlit crown tops go warmer and yellower, shaded undersides and hollows go cooler teal-green
  float sunWarm = clamp( leaf * 0.65 + crownTop * 0.45, 0.0, 1.0 );
  diffuseColor.rgb = mix( diffuseColor.rgb * vec3( 0.74, 0.91, 1.06 ), diffuseColor.rgb * vec3( 1.15, 1.09, 0.78 ), smoothstep( 0.28, 0.78, sunWarm ) );
  // drawn: one luminous painterly wash per crown, keeping the warm-top / cool-underside volume
  if ( uLook > 0.5 ) {
    vec3 flatCrown = vColor.rgb * vColor.rgb * 1.52 * mix( vec3( 0.82, 0.92, 1.02 ), vec3( 1.14, 1.08, 0.86 ), crownTop );
    diffuseColor.rgb = mix( diffuseColor.rgb, flatCrown, 0.72 );
  }
  // Seasonal Huế flora (deciduous crowns only; trunks vKind < 0.5 stay bark)
  if ( vKind > 0.5 && ( uSpring > 0.004 || uAutumn > 0.004 || uWinter > 0.004 ) ) {
    float crownShade = mix( 0.74, 1.18, crownTop ) * ( 0.78 + 0.36 * leaf );
    if ( uSpring > 0.004 ) {
      // Spring / Tết: fresh luminous spring-green foliage + golden hoàng mai & soft peach đào blossoms
      vec3 springCol = diffuseColor.rgb * vec3( 1.06, 1.16, 0.86 );
      float isBlossom = smoothstep( 0.74, 0.78, vTreeSeed );
      vec3 blossomHue = vTreeSeed > 0.90 ? vec3( 0.88, 0.36, 0.44 ) : vec3( 0.92, 0.62, 0.07 );
      float bloomMask = isBlossom * smoothstep( 0.14, 0.68, sunWarm );
      springCol = mix( springCol, blossomHue * crownShade, bloomMask * 0.88 );
      diffuseColor.rgb = mix( diffuseColor.rgb, springCol, uSpring );
    }
    if ( uAutumn > 0.004 ) {
      // Autumn: ~30% evergreens stay deep pine/emerald; ~70% shift into honey-gold, amber-copper & russet
      vec3 autCol = diffuseColor.rgb * vec3( 1.06, 0.96, 0.84 );
      if ( vTreeSeed >= 0.30 ) {
        vec3 autHue = vTreeSeed < 0.52 ? vec3( 0.48, 0.42, 0.09 )
          : vTreeSeed < 0.74 ? vec3( 0.82, 0.46, 0.06 )
          : vTreeSeed < 0.89 ? vec3( 0.72, 0.25, 0.05 )
          : vec3( 0.58, 0.13, 0.06 );
        autCol = mix( autCol, autHue * crownShade, 0.84 );
      }
      diffuseColor.rgb = mix( diffuseColor.rgb, autCol, uAutumn );
    }
    if ( uWinter > 0.004 ) {
      // Winter (mùa đông xứ Huế): cool misty silver-sage & deep rain-soaked cypress green (no snow)
      float wl = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
      vec3 misty = mix( vec3( wl ) * vec3( 0.72, 0.86, 0.92 ), diffuseColor.rgb * vec3( 0.68, 0.84, 0.90 ), 0.52 );
      diffuseColor.rgb = mix( diffuseColor.rgb, misty, uWinter );
    }
  }
  // a crown is pigment, not a lamp: past 0.6 the brightest channel is eased toward 0.85 with the hue kept, or the
  // light blossom (hoàng mai, bằng lăng, phượng) and the sunlit leaf tips go out to white in the sun
  {
    float hueTop = max( diffuseColor.r, max( diffuseColor.g, diffuseColor.b ) );
    if ( hueTop > 0.6 ) diffuseColor.rgb *= ( 0.6 + 0.25 * ( 1.0 - exp( ( 0.6 - hueTop ) / 0.25 ) ) ) / hueTop;
  }
  hueRough = 0.8;
#else

if ( ( vKind > 0.5 && vKind < 1.5 ) || ( vKind > 7.5 && vKind < 8.5 ) || ( vKind > 9.5 && vKind < 11.5 ) ) {
  // ---------------- facade (kind 8: institutions — the same bays on every floor, no shopfronts) ----------------
  // kind 10: Indochine — arched openings, louvred shutters, white trim. kind 11: modern — ribbon glazing, balconies
  bool colonial = vKind > 9.5 && vKind < 10.5;
  bool modern = vKind > 10.5;
  bool civic = vKind > 7.5 && vKind < 8.5;
  diffuseColor.rgb *= mix( 1.0, mix( 0.74, 1.0, smoothstep( 0.0, 6.0, hueH ) ), hueWall );
  vec2 t = normalize( vec2( -hueN.z, hueN.x ) + 1e-5 );
  vec2 uv = vec2( dot( vWPos.xz, t ) / 2.9, hueH / 3.4 );
  vec2 cell = floor( uv ), f = fract( uv );
  hueCell = cell;
  float fw = fwidth( uv.x ) + fwidth( uv.y );
  float detail = ( 1.0 - smoothstep( 0.2, 0.7, fw ) ) * step( 0.5, hueWall ) * step( 0.02, hueH );
  float side = floor( hueN.x * 5.0 ) * 3.7 + floor( hueN.z * 5.0 ) * 1.9;
  float seed = hueHash( cell + side );
  float bay = hueHash( vec2( cell.x + side, 7.0 ) );
  // after dark: whole neighbourhoods are awake or asleep, each facade has its own share of lit rooms,
  // and every lit window its own strength — never a wall of identical bright panes
  float hood = smoothstep( 0.25, 0.8, hueNoise( vWPos.xz * 0.013 ) );
  float litP = mix( 0.05, 0.3, hood ) * ( 0.55 + 0.9 * hueHash( vec2( side, 3.0 ) ) );
  float litK = 0.4 + 0.6 * hueHash( cell + 4.7 );
  vec3 base = diffuseColor.rgb;
  // plaster: soft blotches and rain streaks running down from the eaves
  float streak = hueNoise( vec2( uv.x * 9.0, uv.y * 0.7 ) );
  base *= 0.93 + 0.1 * hueNoise( uv * vec2( 1.7, 2.3 ) ) - 0.09 * streak * smoothstep( 0.2, 1.0, f.y );
  vec3 col = base;
  if ( colonial ) {
    vec2 q = vec2( ( f.x - 0.5 ) * 2.9, ( f.y - 0.6 ) * 3.4 );
    float hw = 0.5, hs = hw + 0.15;
    float win = max( step( abs( q.x ), hw ) * step( 0.13, f.y ) * step( f.y, 0.6 ), step( length( q ), hw ) * step( 0.6, f.y ) );
    float sur = max( step( abs( q.x ), hs ) * step( 0.1, f.y ) * step( f.y, 0.6 ), step( length( q ), hs ) * step( 0.6, f.y ) );
    float upper = step( 0.5, cell.y );
    float shutter = step( hs, abs( q.x ) ) * step( abs( q.x ), hs + 0.4 ) * step( 0.13, f.y ) * step( f.y, 0.62 ) * upper;
    vec3 trim = vec3( 0.95, 0.92, 0.84 );
    vec3 louvre = ( bay < 0.72 ? vec3( 0.15, 0.33, 0.26 ) : vec3( 0.2, 0.31, 0.4 ) ) * ( 0.76 + 0.24 * step( 0.5, fract( f.y * 26.0 ) ) );
    vec3 glass = mix( vec3( 0.05, 0.06, 0.08 ), vec3( 0.2, 0.27, 0.33 ), smoothstep( 0.15, 0.7, f.y ) );
    glass *= 1.0 - 0.55 * ( 1.0 - smoothstep( 0.0, 0.035, abs( q.x ) ) );
    glass *= 1.0 - 0.45 * smoothstep( 0.52, 0.72, f.y );
    // at street level the arches open onto a shaded arcade
    glass = mix( mix( vec3( 0.06, 0.05, 0.05 ), vec3( 0.16, 0.12, 0.09 ), smoothstep( 0.0, 0.6, f.y ) ), glass, upper );
    col = mix( col, trim, sur * 0.94 );
    col = mix( col, louvre, shutter );
    col = mix( col, glass, win );
    // string course at every floor, a pilaster every third bay, a darker plinth
    col = mix( col, trim, 1.0 - smoothstep( 0.05, 0.07, f.y ) );
    col = mix( col, trim * 0.97, step( mod( cell.x, 3.0 ), 0.5 ) * ( 1.0 - smoothstep( 0.06, 0.08, f.x ) ) );
    col = mix( col, base * 0.7, ( 1.0 - upper ) * ( 1.0 - win ) * ( 1.0 - smoothstep( 0.1, 0.12, f.y ) ) * step( 0.07, f.y ) );
    hueGlass = win * upper * detail;
    hueLit = win * step( seed, mix( litP * 1.4, litP, upper ) ) * litK;
  } else if ( modern ) {
    if ( cell.y < 0.5 ) {
      // a glazed front under a sign board
      float open = smoothstep( 0.03, 0.05, f.x ) * smoothstep( 0.97, 0.95, f.x ) * step( 0.03, f.y ) * step( f.y, 0.7 );
      vec3 g = mix( vec3( 0.07, 0.09, 0.11 ), vec3( 0.3, 0.39, 0.45 ), f.y );
      g *= 1.0 - 0.5 * ( 1.0 - smoothstep( 0.0, 0.02, abs( f.x - 0.5 ) ) );
      float sign = step( 0.74, f.y ) * step( f.y, 0.94 ) * step( 0.3, bay );
      vec3 signCol = bay < 0.48 ? vec3( 0.72, 0.13, 0.1 ) : bay < 0.64 ? vec3( 0.1, 0.3, 0.58 ) : bay < 0.8 ? vec3( 0.93, 0.74, 0.12 ) : vec3( 0.9, 0.9, 0.88 );
      col = mix( col, g, open );
      col = mix( col, signCol, sign );
      hueGlass = open * detail;
      hueLit = open * step( seed, 0.4 ) * 0.7;
    } else {
      float balc = step( bay, 0.3 );
      float band = step( 0.36, f.y ) * step( f.y, 0.8 ) * smoothstep( 0.02, 0.04, f.x ) * smoothstep( 0.98, 0.96, f.x );
      vec3 glass = mix( vec3( 0.08, 0.13, 0.17 ), vec3( 0.4, 0.55, 0.66 ), smoothstep( 0.36, 0.8, f.y ) );
      glass *= 1.0 - 0.5 * ( 1.0 - smoothstep( 0.0, 0.018, abs( f.x - 0.5 ) ) );
      // balcony bays: a recessed door behind a slab and a rail
      float recess = step( 0.1, f.x ) * step( f.x, 0.9 ) * step( 0.07, f.y ) * step( f.y, 0.84 );
      vec3 rc = mix( vec3( 0.1, 0.11, 0.12 ), vec3( 0.26, 0.33, 0.38 ), smoothstep( 0.3, 0.84, f.y ) );
      float rail = step( 0.07, f.y ) * step( f.y, 0.33 ) * step( 0.06, f.x ) * step( f.x, 0.94 );
      rc = mix( rc, base * 1.08, rail * ( 0.55 + 0.45 * step( 0.5, fract( f.x * 12.0 ) ) ) );
      float win = mix( band, recess, balc );
      col = mix( col, mix( glass, rc, balc ), win );
      col = mix( col, base * 1.12, balc * step( f.y, 0.07 ) );
      // an air-conditioner under some windows
      float ac = ( 1.0 - balc ) * step( 0.62, seed ) * step( 0.7, f.x ) * step( f.x, 0.9 ) * step( 0.12, f.y ) * step( f.y, 0.27 );
      col = mix( col, vec3( 0.78, 0.79, 0.78 ) * ( 0.8 + 0.2 * step( 0.5, fract( f.y * 30.0 ) ) ), ac );
      col *= 1.0 - 0.1 * ( 1.0 - smoothstep( 0.0, 0.03, f.y ) );
      hueGlass = win * ( 1.0 - balc * rail ) * detail;
      hueLit = win * step( seed, litP ) * litK * ( 1.0 - balc * rail );
    }
  } else if ( cell.y < 0.5 && !civic ) {
    // street level: a shopfront or doorway under an awning
    float open = smoothstep( 0.1, 0.14, f.x ) * smoothstep( 0.9, 0.86, f.x ) * smoothstep( 0.02, 0.05, f.y ) * smoothstep( 0.72, 0.68, f.y );
    float awn = smoothstep( 0.04, 0.08, f.x ) * smoothstep( 0.96, 0.92, f.x ) * smoothstep( 0.7, 0.73, f.y ) * smoothstep( 0.86, 0.83, f.y );
    vec3 awnCol = bay < 0.25 ? vec3( 0.55, 0.16, 0.12 ) : bay < 0.5 ? vec3( 0.14, 0.32, 0.42 ) : bay < 0.75 ? vec3( 0.72, 0.56, 0.2 ) : vec3( 0.2, 0.38, 0.26 );
    awnCol *= 0.85 + 0.3 * step( 0.5, fract( uv.x * 9.0 ) );
    vec3 inside = mix( vec3( 0.05, 0.045, 0.045 ), vec3( 0.2, 0.15, 0.11 ), smoothstep( 0.0, 0.7, f.y ) * 0.6 );
    col = mix( col, inside, open * step( 0.22, bay ) );
    col = mix( col, awnCol, awn * step( 0.4, bay ) );
    hueLit = open * step( 0.22, bay ) * step( seed, 0.36 ) * 0.7;
    hueHgt -= 0.2 * open * step( 0.22, bay ) * detail;
  } else {
    float inX = smoothstep( 0.23, 0.26, f.x ) * smoothstep( 0.77, 0.74, f.x );
    float inY = smoothstep( 0.3, 0.33, f.y ) * smoothstep( 0.8, 0.77, f.y );
    float win = inX * inY;
    float frame = smoothstep( 0.18, 0.21, f.x ) * smoothstep( 0.82, 0.79, f.x ) * smoothstep( 0.25, 0.28, f.y ) * smoothstep( 0.85, 0.82, f.y );
    float sill = smoothstep( 0.15, 0.18, f.x ) * smoothstep( 0.85, 0.82, f.x ) * smoothstep( 0.2, 0.22, f.y ) * smoothstep( 0.27, 0.25, f.y );
    // glass picks up a little sky toward its top edge; mullion down the middle
    vec3 glass = mix( vec3( 0.06, 0.08, 0.11 ), vec3( 0.26, 0.36, 0.46 ), smoothstep( 0.3, 0.8, f.y ) );
    glass *= 1.0 - 0.6 * ( 1.0 - smoothstep( 0.0, 0.02, abs( f.x - 0.5 ) ) );
    // some windows keep their shutters closed
    float shut = step( 0.74, seed );
    vec3 shutCol = bay < 0.33 ? vec3( 0.17, 0.33, 0.27 ) : bay < 0.66 ? vec3( 0.2, 0.3, 0.4 ) : vec3( 0.36, 0.23, 0.15 );
    shutCol *= 0.8 + 0.2 * step( 0.5, fract( f.y * 22.0 ) );
    col = mix( col, base * 1.14, ( frame - win ) * 0.9 );
    col = mix( col, base * 0.62, sill );
    // the opening is recessed: the lintel and one jamb throw a shadow onto the glass
    float reveal = max( smoothstep( 0.7, 0.78, f.y ), 1.0 - smoothstep( 0.26, 0.33, f.x ) );
    glass *= 1.0 - 0.5 * reveal;
    shutCol *= 1.0 - 0.3 * reveal;
    col = mix( col, mix( glass, shutCol, shut ), win );
    hueGlass = win * ( 1.0 - shut ) * detail;
    // floor line
    col *= 1.0 - 0.14 * ( 1.0 - smoothstep( 0.0, 0.035, f.y ) );
    hueLit = win * ( 1.0 - shut ) * step( seed, litP ) * litK;
  }
  diffuseColor.rgb = mix( base * 0.9, col, detail );
  // age: damp rising from the ground and mould under the eaves — old lime-washed walls are never one colour
  float damp = ( 1.0 - smoothstep( 0.0, 1.6, hueH ) ) * ( 0.45 + 0.55 * hueNoise( vec2( uv.x * 3.1, 2.0 ) ) );
  float mould = hueNoise( vec2( uv.x * 1.3 + 5.0, uv.y * 0.35 ) ) * hueNoise( vec2( uv.x * 5.7, uv.y * 1.1 + 3.0 ) );
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.62, 0.7, 0.56 ), clamp( damp * 0.75 + smoothstep( 0.22, 0.5, mould ) * 0.4, 0.0, 0.8 ) * hueWall * ( modern ? 0.3 : 1.0 ) );
  hueLit = mix( 0.02 + 0.045 * hood, hueLit, detail ) * step( 0.5, hueWall ) * step( 0.3, hueH );
  hueRough = modern ? 0.8 : 0.9;
  // plaster is never flat; openings sit back from the wall face
  hueHgt += ( 0.006 * hueNoise( uv * vec2( 31.0, 37.0 ) ) + 0.012 * hueNoise( uv * vec2( 5.0, 7.0 ) ) ) * detail - 0.07 * hueGlass;
  float roomK = hueGlass * ( 1.0 - smoothstep( 0.04, 0.22, fw ) ) * ( 1.0 - uLook );
  if ( roomK > 0.01 ) {
    vec3 rv = normalize( vWPos - cameraPosition );
    vec3 room = hueRoom( f, vec3( dot( rv.xz, t ), rv.y, -dot( rv, hueN ) ), vec2( 2.9, 3.4 ), cell.y < 0.5 ? 6.0 : 4.2, hueHash( cell + side + 1.7 ) );
    // a curtain or blind drawn part of the way on some windows
    float blind = step( 0.55, hueHash( cell + side + 5.3 ) ) * step( 0.78 - 0.3 * hueHash( cell + 8.1 ), f.y ) * step( 0.5, cell.y );
    room = mix( room, vec3( 0.8, 0.76, 0.66 ), blind * 0.9 );
    diffuseColor.rgb = mix( diffuseColor.rgb, room * 0.42 * ( 0.75 + 0.25 * smoothstep( 0.0, 0.02, abs( f.x - 0.5 ) ) ), roomK * 0.86 );
    hueRoomC = mix( vec3( 1.0 ), room * 1.7, roomK );
  }
  hueRough = mix( hueRough, 0.07, hueGlass * ( 1.0 - uLook ) );
  hueMetal = 0.1 * hueGlass * ( 1.0 - uLook );
} else if ( ( vKind > 1.5 && vKind < 2.5 ) || ( vKind > 8.5 && vKind < 9.5 ) ) {
  // ---------------- roof tiles (kind 9: glazed imperial tiles, which catch the sun) ----------------
  // abs: the underside of an eave or a canopy faces straight down, and cross( down, up ) is zero, which normalize()
  // turns into NaN; post's focus blur and bloom then spread that one pixel over the whole canvas (see post.js)
  vec3 e = abs( hueN.y ) > 0.985 ? vec3( 1.0, 0.0, 0.0 ) : normalize( cross( hueN, vec3( 0.0, 1.0, 0.0 ) ) );
  vec3 s = cross( e, hueN );
  vec2 uv = vec2( dot( vWPos, e ) / 0.52, dot( vWPos, s ) / 0.72 );
  float fw = fwidth( uv.x ) + fwidth( uv.y );
  float detail = 1.0 - smoothstep( 0.35, 1.2, fw );
  float ridge = pow( abs( sin( 3.14159 * uv.x ) ), 0.52 );
  float course = smoothstep( 0.0, 0.16, fract( uv.y ) );
  float jit = hueHash( floor( uv ) );
  float shade = ( 0.7 + 0.36 * ridge ) * ( 0.8 + 0.2 * course ) * ( 0.94 + 0.12 * jit );
  // drawn: a flat wash hatched down the slope, the pen lifting here and there
  float hatch = ( 1.0 - smoothstep( 0.0, 0.2, abs( sin( 3.14159 * uv.x ) ) ) ) * step( 0.2, hueHash( floor( vec2( uv.x, uv.y * 0.4 ) ) ) );
  shade = mix( shade, 1.06 - 0.36 * hatch, uLook );
  // age: darker patches, lighter where rain has washed the ridges
  hueRib = normalize( hueN + e * cos( 3.14159 * uv.x ) * 0.52 * detail );
  // each course laps the one below: the lip tips the tile a little down the slope
  hueNp = normalize( hueRib - s * ( 1.0 - course ) * 0.4 * detail );
  hueGlaze = vKind > 8.5 ? 1.0 : 0.12;
  float age = hueNoise( vWPos.xz * 0.35 ) * 0.6 + hueNoise( vWPos.xz * 1.4 ) * 0.4;
  diffuseColor.rgb *= mix( 0.93, shade, detail ) * ( 0.86 + 0.26 * age );
  // subtle per-tile warmth shift (fired clay and ceramic glaze vary slightly from batch to batch)
  diffuseColor.rgb *= mix( vec3( 1.0 ), mix( vec3( 0.95, 0.98, 1.04 ), vec3( 1.05, 1.0, 0.93 ), jit ), detail * ( 1.0 - uLook ) );
  // lichen and soot where unglazed tiles stay damp; glazed ceramic tiles shed most moss
  float moss = hueNoise( vWPos.xz * 0.23 + 31.0 ) * 0.65 + hueNoise( vWPos.xz * 1.1 + 7.0 ) * 0.35;
  float mossK = vKind > 8.5 ? 0.14 : 0.44;
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.6, 0.7, 0.52 ), smoothstep( 0.44, 0.8, moss ) * mossK );
  // soot-dark courses near the eaves, where old tiles hold water longest
  diffuseColor.rgb *= 1.0 - ( vKind > 8.5 ? 0.08 : 0.14 ) * smoothstep( 0.58, 0.94, hueNoise( vWPos.xz * 2.4 ) );
  // glazed imperial tile keeps a ceramic sheen where moss has not taken it; clay tile is matt
  hueRough = vKind > 8.5 ? mix( 0.2, 0.46, smoothstep( 0.44, 0.8, moss ) ) : mix( 0.66, 0.9, age );
  hueMetal = vKind > 8.5 ? 0.08 : 0.0;
} else if ( vKind > 3.5 && vKind < 4.5 ) {
  // ---------------- brick and stone ----------------
  // stronger grounding AO near the earth/waterline, fading smoothly up the rampart
  diffuseColor.rgb *= mix( 1.0, mix( 0.68, 1.0, smoothstep( 0.0, 4.5, hueH ) ), hueWall );
  vec2 t = normalize( vec2( -hueN.z, hueN.x ) + 1e-5 );
  float along = dot( vWPos.xz, t );
  float rowf = vWPos.y / 0.62;
  float row = floor( rowf );
  float bu = along / 1.45 + 0.5 * mod( row, 2.0 );
  float fw = fwidth( bu ) + fwidth( rowf );
  float detail = ( 1.0 - smoothstep( 0.25, 0.8, fw ) ) * step( 0.5, hueWall );
  float joint = max( 1.0 - smoothstep( 0.0, 0.1, fract( rowf ) ), 1.0 - smoothstep( 0.0, 0.055, fract( bu ) ) );
  float jit = hueHash( vec2( floor( bu ), row ) );
  float bricks = ( 1.0 - 0.36 * joint ) * ( 0.8 + 0.36 * jit );
  diffuseColor.rgb *= mix( 0.95, bricks, detail );
  // subtle fired-brick / weathered-stone hue variation
  diffuseColor.rgb *= mix( vec3( 1.0 ), mix( vec3( 0.93, 0.96, 1.02 ), vec3( 1.06, 0.98, 0.91 ), jit ), detail * 0.7 * ( 1.0 - uLook ) );
  // damp and moss creeping over old masonry (stronger in crevices and lower courses)
  float moss = hueNoise( vec2( along * 0.12, vWPos.y * 0.45 ) ) * 0.7 + hueNoise( vec2( along * 0.5, vWPos.y * 1.3 ) ) * 0.3;
  float lowMoss = 1.0 - smoothstep( 0.0, 3.2, hueH );
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.66, 0.96, 0.56 ), clamp( smoothstep( 0.42, 0.82, moss ) * 0.58 + lowMoss * 0.22, 0.0, 0.75 ) * hueWall );
  diffuseColor.rgb *= 0.88 + 0.24 * hueNoise( vec2( along * 0.05, vWPos.y * 0.2 ) + 9.0 );
  hueRough = mix( 0.94, 0.82, lowMoss * 0.5 );
  hueHgt = ( -0.036 * joint + 0.015 * jit + 0.01 * hueNoise( vec2( along, vWPos.y ) * 9.0 ) ) * detail * detail;
} else if ( vKind > 4.5 && vKind < 5.5 ) {
  // ---------------- planted ground ----------------
  float gMacro = hueNoise( vWPos.xz * 0.035 );
  float g = hueNoise( vWPos.xz * 0.11 ) * 0.5 + hueNoise( vWPos.xz * 0.85 ) * 0.3 + hueNoise( vWPos.xz * 4.5 ) * 0.2;
  diffuseColor.rgb *= ( 0.78 + 0.4 * g ) * ( 0.9 + 0.2 * gMacro );
  // warm sunlit grass blades vs cooler lush shaded patches
  diffuseColor.rgb = mix( diffuseColor.rgb * vec3( 0.88, 1.02, 0.92 ), diffuseColor.rgb * vec3( 1.12, 1.05, 0.76 ), smoothstep( 0.35, 0.82, g * 0.7 + gMacro * 0.3 ) * 0.52 );
  hueRough = 0.96;
  if ( uLook > 0.5 ) {
    // drawn grass: small pen marks scattered over the wash
    vec2 gc = vWPos.xz / 2.3, gi = floor( gc );
    vec2 gf = fract( gc ) - 0.5 + ( vec2( hueHash( gi + 3.1 ), hueHash( gi + 7.7 ) ) - 0.5 ) * 0.5;
    float gtick = ( 1.0 - smoothstep( 0.02, 0.055, abs( gf.y + 0.08 - abs( gf.x ) * 1.4 ) ) ) * step( abs( gf.x ), 0.13 ) * step( 0.6, hueHash( gi ) ) * ( 1.0 - smoothstep( 0.12, 0.45, fwidth( gc.x ) + fwidth( gc.y ) ) );
    diffuseColor.rgb *= 1.0 - 0.34 * gtick;
  }
} else if ( vKind > 5.5 && vKind < 6.5 ) {
  // ---------------- paving ----------------
  float pm = hueNoise( vWPos.xz * 0.08 ) * 0.5 + hueNoise( vWPos.xz * 0.7 ) * 0.35 + hueNoise( vWPos.xz * 6.5 ) * 0.15;
  diffuseColor.rgb *= 0.89 + 0.2 * pm;
  hueRough = 0.84;
  #ifndef HUE_OVERLAY
  if ( hueH > -0.05 && hueN.y > 0.7 ) {
    // terraces, courtyards and plazas laid in flagstones or concrete slabs: staggered joints, each tile its own tone
    float slab = hueH > 0.3 ? 1.5 : 2.6;
    vec2 pv = vWPos.xz / slab;
    pv.x += step( 0.5, fract( pv.y * 0.5 ) ) * 0.5;
    vec2 pf = abs( fract( pv ) - 0.5 );
    float pw = fwidth( pv.x ) + fwidth( pv.y );
    float near = 1.0 - smoothstep( 0.06, 0.28, pw );
    float jStr = hueH > 0.3 ? 0.22 : 0.13;
    diffuseColor.rgb *= 1.0 - jStr * smoothstep( 0.45, 0.5, max( pf.x, pf.y ) ) * near;
    diffuseColor.rgb *= 1.0 + ( hueHash( floor( pv ) ) - 0.5 ) * ( hueH > 0.3 ? 0.12 : 0.08 ) * near;
    hueHgt = -0.022 * smoothstep( 0.45, 0.5, max( pf.x, pf.y ) ) * near * near;
  }
  #endif
} else if ( vKind > 6.5 && vKind < 7.5 ) {
  // ---------------- lacquered timber hall: columns, panelled doors ----------------
  diffuseColor.rgb *= mix( 1.0, mix( 0.74, 1.0, smoothstep( 0.0, 5.0, hueH ) ), hueWall );
  vec2 t = normalize( vec2( -hueN.z, hueN.x ) + 1e-5 );
  float u = dot( vWPos.xz, t ) / 2.5;
  float f = fract( u );
  float detail = ( 1.0 - smoothstep( 0.2, 0.7, fwidth( u ) * 2.0 ) ) * step( 0.5, hueWall );
  float column = 1.0 - smoothstep( 0.05, 0.08, abs( f - 0.5 ) );
  float panel = smoothstep( 0.1, 0.13, abs( f - 0.5 ) ) * ( 1.0 - smoothstep( 0.42, 0.45, abs( f - 0.5 ) ) );
  float lattice = step( 0.5, fract( vWPos.y * 2.2 ) ) * step( 0.5, fract( u * 6.0 ) );
  vec3 base = diffuseColor.rgb;
  vec3 col = mix( base, base * 0.52 + vec3( 0.02, 0.012, 0.0 ) * lattice, panel );
  col = mix( col, base * 1.25 + vec3( 0.06, 0.03, 0.0 ), column );
  diffuseColor.rgb = mix( base * 0.82, col, detail );
  hueCell = vec2( floor( u ), 0.0 );
  hueRough = mix( 0.48, 0.74, panel ); // lacquer on the columns, dull panels
  hueHgt = ( 0.06 * column - 0.03 * panel ) * detail;
  hueLit = panel * 0.16 * detail * step( 0.3, hueH ) * step( hueHash( hueCell + 2.3 ), 0.38 ); // a lamp behind some of the doors, not all
} else if ( vKind > 2.5 && vKind < 3.5 ) {
  // ---------------- flat roofs ----------------
  float c = hueNoise( vWPos.xz * 0.5 ) * 0.6 + hueNoise( vWPos.xz * 3.0 ) * 0.4;
  diffuseColor.rgb *= 0.84 + 0.26 * c;
  hueRough = 0.9;
} else if ( vKind > 11.5 ) {
  // ---------------- a line laid on the ground (kerbs, road edges): a stone joint, or the pen in the drawn look ----------------
  // once a pixel covers more than the line is wide it would only sparkle, so it thins out into what lies under it
  float lpx = fwidth( vWPos.x ) + fwidth( vWPos.z );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.075, 0.055, 0.05 ), uLook * 0.8 * ( 1.0 - smoothstep( 0.5, 2.2, lpx ) ) );
} else {
  // ---------------- plain architectural plaster, stone trim & hero GLB sculptural accents ----------------
  diffuseColor.rgb *= mix( 1.0, mix( 0.74, 1.0, smoothstep( 0.0, 4.5, hueH ) ), hueWall * step( 0.0, hueH ) );
  float gr = hueNoise( vWPos.xz * 0.45 + vWPos.y * 0.35 ) * 0.6 + hueNoise( vWPos.xz * 3.2 - vWPos.y * 2.4 ) * 0.4;
  diffuseColor.rgb *= 0.92 + 0.16 * gr;
  #ifdef HUE_HERO
  // Hero GLB sculptural details: warm gold/bronze/jade enamel ornaments get real metallic/ceramic sheen
  {
    vec3 hc = diffuseColor.rgb;
    float lum = max( hc.r, max( hc.g, hc.b ) );
    float sat = ( lum - min( hc.r, min( hc.g, hc.b ) ) ) / max( lum, 0.001 );
    float isGold = smoothstep( 0.28, 0.55, sat ) * smoothstep( 0.18, 0.45, hc.r ) * step( hc.b, hc.g * 0.85 );
    float isJade = smoothstep( 0.22, 0.48, sat ) * step( hc.r, hc.g * 0.85 ) * smoothstep( 0.08, 0.25, hc.g );
    float isBronze = smoothstep( 0.14, 0.35, sat ) * step( lum, 0.28 ) * step( hc.b, hc.r * 0.8 );
    float sheen = clamp( isGold + isJade * 0.85 + isBronze * 0.75, 0.0, 1.0 );
    hueRough = mix( 0.82, 0.24, sheen );
    hueMetal = clamp( isGold * 0.52 + isBronze * 0.45 + isJade * 0.12, 0.0, 0.58 );
    hueGlaze = max( hueGlaze, sheen * 0.75 );
  }
  #else
  // Cool blue-slate architectural glass on modern landmarks (Vincom, AEON, transit hubs) catches crisp sky/sun reflections
  {
    vec3 pc = diffuseColor.rgb;
    float isBlueGlass = hueWall * step( pc.r * 1.18, pc.b ) * step( pc.r, 0.24 ) * smoothstep( 0.04, 0.14, pc.b );
    hueRough = mix( hueRough, 0.08, isBlueGlass * ( 1.0 - uLook ) );
    hueMetal = mix( hueMetal, 0.22, isBlueGlass * ( 1.0 - uLook ) );
    hueGlass = max( hueGlass, isBlueGlass * ( 1.0 - uLook ) );
  }
  hueHgt = ( 0.008 * hueNoise( vWPos.xz * 4.5 + vWPos.y * 4.5 ) ) * ( 1.0 - smoothstep( 0.15, 0.6, fwidth( vWPos.x ) + fwidth( vWPos.z ) ) );
  #endif
}
{
  // relief to normal: the height's screen-space slope, laid back into the surface
  vec3 hdx = dFdx( vWPos ), hdy = dFdy( vWPos );
  vec3 hr1 = cross( hdy, hueN ), hr2 = cross( hueN, hdx );
  float hdet = dot( hdx, hr1 );
  vec3 hgrad = sign( hdet ) * ( dFdx( hueHgt ) * hr1 + dFdy( hueHgt ) * hr2 );
  hgrad *= min( 1.0, 1.4 * abs( hdet ) / ( length( hgrad ) + 1e-6 ) );
  hueNp = normalize( abs( hdet ) * hueNp - hgrad + 1e-6 * hueN );
}
#endif
// rain darkens what it soaks: ground and roofs most, walls a little
diffuseColor.rgb *= 1.0 - uWet * mix( 0.26, 0.1, hueWall );
// and leaves a film that mirrors the sky on hard surfaces (paving, stone, roofs); grass and parks stay damp, never mirror-bright
float huePuddle = smoothstep( 0.35, 0.72, hueNoise( vWPos.xz * 0.18 ) * 0.65 + hueNoise( vWPos.xz * 0.85 ) * 0.35 );
float hueWetSurf = smoothstep( 0.25, 0.85, hueN.y ) * mix( 0.35, 1.0, huePuddle );
float hueHard = 1.0;
#ifdef HUE_FOLIAGE
hueHard = 0.0;
#else
if ( vKind > 4.5 && vKind < 5.5 ) hueHard = 0.0;
#endif
hueRough = mix( hueRough, mix( 0.42, 0.14, hueHard ), hueWetSurf * uWet * mix( 0.55, 0.8, hueHard ) );
if ( hueHard < 0.5 ) hueRough = max( hueRough, 0.38 );
if ( uLook > 0.5 ) { hueRough = 1.0; hueMetal = 0.0; hueNp = hueN; }
`;


// Trees: the instance colour is the crown's. Trunks and limbs (aKind 0, see PART in foliage.js) keep their baked bark.
export const FOLIAGE_COLOR = /* glsl */ `
#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
  vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR
  vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
  if ( aKind > 0.5 ) vColor.rgb *= instanceColor.rgb;
#endif`;
