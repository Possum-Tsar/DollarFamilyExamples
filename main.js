var drawnShape = [];
const resampledPoints = 32;
const origin = new point(0, 0);
const Phi = 0.5 * (-1.0 + Math.sqrt(5.0));

function point(x, y) {
    this.x = x;
    this.y = y;
}

function boundingBoxObject(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
}

function stroke(name, pathArray) {
    this.name = name;
    this.pathArray = pathArray;
}

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let coord = { x: 0, y: 0 };

canvas.addEventListener("mousedown", start);
canvas.addEventListener("mouseup", stop);

function start(event) { canvas.addEventListener("mousemove", draw); reposition(event); }

ctx.canvas.width = 400;
ctx.canvas.height = 400;

function reposition(event) {
    coord.x = event.clientX;
    scrollY = canvas.getBoundingClientRect().top;
    coord.y = event.clientY - scrollY;
    //collect points here to pass to array
    drawnShape.push(new point(coord.x, coord.y))
}

function stop() {
    console.clear();
    canvas.removeEventListener("mousemove", draw);
    var oneDollarOutput = oneDollar();
    console.log("One Dollar: " + oneDollarOutput);
    document.getElementById("oneDollar").innerHTML = oneDollarOutput;

    var penpinchOut = pennyPincher();
    console.log("Penny Pincher: " + penpinchOut);
    document.getElementById("pennyPincher").innerHTML = penpinchOut;

    var onec = oneCent();
    console.log("One Cent: " + '"' + onec + '"');
    document.getElementById("onecent").innerHTML = '"' + onec + '"';

}

function draw(event) {
    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
    ctx.moveTo(coord.x, coord.y);
    reposition(event);
    ctx.lineTo(coord.x, coord.y);
    ctx.stroke();

}

function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); drawnShape = []; }

/////////////// begin one dollar
function oneDollar() {
    var resamp = dollarResample(); //resample points
    var rotatedResamp = rotateResamp(resamp); //rotate resampled points
    var scaledResamp = scaleToBox(rotatedResamp);    //scale rotatedResamp to bounding box
    var translatedResamp = translatePoints(scaledResamp);
    JSON.stringify("----------------------------------------------------------------");
    generateDollarTemplate(translatedResamp);
    JSON.stringify("----------------------------------------------------------------");

    //match points against template
    // ??make a template object, each as an array of points??
    var dollarOutput = dollarCompare(translatedResamp);
    return JSON.stringify(dollarOutput);
}

function dollarResample() {
    var resamp = [];
    var distTmp = 0.0;
    //console.clear();
    //var numPts = drawnShape.length;

    var pathLen = calcPathLength();  //calculates the path length of the gesture

    var resampDistance = pathLen / (resampledPoints - 1);

    for (var x = 1; x < drawnShape.length; x++) {
        var distUsed = Distance(drawnShape[x - 1], drawnShape[x]);
        while (distTmp + distUsed >= resampDistance) {
            var t = Math.min((resampDistance - distTmp) / distUsed, 1.0); // Ensure t is not greater than 1
            var qx = drawnShape[x - 1].x + t * (drawnShape[x].x - drawnShape[x - 1].x);
            var qy = drawnShape[x - 1].y + t * (drawnShape[x].y - drawnShape[x - 1].y);
            resamp.push(new point(qx, qy));
            distTmp -= resampDistance;
        }
        distTmp += distUsed;
    }
    // Add the last point if needed to ensure exactly 32 points
    while (resamp.length < resampledPoints) {
        resamp.push(new point(drawnShape[drawnShape.length - 1].x, drawnShape[drawnShape.length - 1].y));
    }
    return (resamp);
}
function calcPathLength() {
    //this function gets the total path length of the drawn gesture and returns it
    var total = 0;
    for (var i = 0; i < drawnShape.length - 1; i++) {
        var pos1 = new point(drawnShape[i].x, drawnShape[i].y);
        var pos2 = new point(drawnShape[i + 1].x, drawnShape[i + 1].y);
        total += ((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2) ** 0.5;
    };
    return total;
};

function Distance(p1, p2) {
    //this function gets the distance between 2 points
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function rotateResamp(resamp) {
    //Find and save the indicative angle ω from the points’ centroid to first point.
    //Then rotate by –ω to set this angle to 0°
    var rotatedResamp = [];
    const centroid = centroidCompute(resamp); // find centroid
    const firstPoint = resamp[0];
    const indicativeAngle = Math.atan2(centroid.y - firstPoint.y, centroid.x - firstPoint.x); //find indicative angle ω

    for (var i = 0; i < resamp.length; i++) {
        //qx = (resampx – centroidx) COSω – (resampy – centroidy) SINω + centroidx
        var qx = (resamp[i].x - centroid.x) * Math.cos(indicativeAngle) - (resamp[i].y - centroid.y) * Math.sin(indicativeAngle) + centroid.x;
        //qy = (resampx – centroidx) SINω + (resampy – centroidy) COSω + centroidy
        var qy = (resamp[i].x - centroid.x) * Math.sin(indicativeAngle) - (resamp[i].y - centroid.y) * Math.cos(indicativeAngle) + centroid.y;
        //ω = indiciative angle
        rotatedResamp.push(new point(qx, qy));
    }
    return rotatedResamp;
}

function centroidCompute(resamp) {
    var sumx = 0;
    var sumy = 0;

    for (var i = 0; i < resamp.length; i++) {
        sumx += resamp[i].x;
        sumy += resamp[i].y;
    }
    var centroidX = sumx / resamp.length;
    var centroidY = sumy / resamp.length;
    return new point(centroidX, centroidY);
}

function scaleToBox(rotatedResamp) {
    var scaledResamp = [];
    const boxSize = 250;
    const boundingbox = calcBoundingBox(rotatedResamp);
    //scale points to bounding box
    for (var i = 0; i < rotatedResamp.length; i++) {
        var qx = rotatedResamp[i].x * (boxSize / boundingbox.width);
        var qy = rotatedResamp[i].y * (boxSize / boundingbox.height);
        scaledResamp.push(new point(qx, qy));
    }
    return scaledResamp;
}

function calcBoundingBox(rotatedResamp) {

    var minX = +Infinity;
    var maxX = -Infinity;
    var minY = +Infinity;
    var maxY = -Infinity;

    for (var i = 0; i < rotatedResamp.length; i++) {
        minX = Math.min(minX, rotatedResamp[i].x);
        minY = Math.min(minY, rotatedResamp[i].y);
        maxX = Math.max(maxX, rotatedResamp[i].x);
        maxY = Math.max(maxY, rotatedResamp[i].y);
    }

    var width = maxX - minX;
    var height = maxY - minY;

    return new boundingBoxObject(minX, minY, width, height);
}

function translatePoints(scaledResamp) {
    //translates centroid to (0,0)
    var translatedResamp = [];
    var centroid = centroidCompute(scaledResamp);

    for (var i = 0; i < scaledResamp.length; i++) {
        var qx = scaledResamp[i].x + origin.x - centroid.x; //remap x
        var qy = scaledResamp[i].y + origin.y - centroid.y; //remap y
        translatedResamp.push(new point(qx, qy))
    }
    return translatedResamp;
}

function dollarCompare(translatedResamp) {
    var mtchVar = -1;
    var ab = +Infinity;

    const dollarTemplates = [];
    dollarTemplates.push(new stroke("box", new Array(new point(-7.579172466314674, -2.842170943040401e-14), new point(8.63932406287654, -15.288444875570008), new point(25.05140981463188, -30.801553609080756), new point(42.92205016744805, -48.00734181798444), new point(59.968043621546485, -64.25010573534641), new point(76.8992590013757, -80.36126914046943), new point(94.13008749814352, -96.8206266239501), new point(110.7962008591955, -112.6260711443853), new point(127.01469738838676, -127.9145160199553), new point(117.72834753780097, -116.74229858360906), new point(103.43175748415035, -100.27573066472095), new point(88.7224510831521, -83.41867545140812), new point(72.31501445643542, -65.00536360416442), new point(54.50512474609144, -45.302430443037), new point(38.317595113101845, -27.472802541298307), new point(23.487196849937533, -13.739383280047804), new point(8.882071022587724, -0.2817578814623687), new point(-6.29655916348068, 13.822711860593756), new point(-21.6741594217806, 28.152556747556417), new point(-36.86669664260128, 42.27292105640274), new point(-52.21125513953153, 56.566256946869004), new point(-67.46977059245314, 70.762580734144), new point(-83.31137465543752, 85.6229172079347), new point(-100.21136853082764, 101.71006562258418), new point(-115.96257658136051, 116.50668430500949), new point(-122.98530261161324, 122.0854839800447), new point(-107.27515575710922, 104.31056169887123), new point(-92.56584935611096, 87.45350648555836), new point(-78.54046351617474, 71.26567856053677), new point(-63.479462750377294, 54.120131572969655), new point(-48.19073176084487, 36.82815731870713), new point(-48.19073176084487, 36.82815731870713))));
    dollarTemplates.push(new stroke("triangle", new Array(new point(-101.73595795425254, -5.684341886080802e-14), new point(-84.94114899108033, 20.775141568550765), new point(-68.22429166556051, 41.65528519902605), new point(-50.863404031377826, 61.68641156345669), new point(-34.83236208742031, 83.36338093218129), new point(-19.124818599183925, 105.29830069118069), new point(-4.341743685987865, 128.07444466317205), new point(9.619222313493026, 149.27609080931572), new point(21.212027753496898, 159.79813239980442), new point(27.323755336984448, 134.24649721327862), new point(33.553208960177756, 108.72517273773312), new point(42.076024943684274, 84.52082572059774), new point(50.59884092719079, 60.31647870346225), new point(59.121656910697254, 36.112131686326876), new point(69.03013686493904, 12.91592623141102), new point(79.176631132404, -10.107111610987431), new point(91.56703421229219, -31.077971458086182), new point(105.43762290987223, -50.460305680314946), new point(120.41980124615293, -67.62861472326748), new point(102.81928663856996, -61.642880771884904), new point(80.5691157541541, -63.38034970824239), new point(58.28136045227075, -66.72098229225821), new point(36.06780632906509, -72.35481157113074), new point(13.807422390866293, -75.95375062691932), new point(-8.360957958329095, -81.36489322857727), new point(-29.900481494665428, -86.72692972748052), new point(-52.15065237908132, -88.46439866383807), new point(-74.40082326349719, -90.20186760019556), new point(-96.26159872455636, -89.06019975869688), new point(-116.38231673362407, -84.67809838702289), new point(-129.58019875384707, -83.47052715529799), new point(-129.58019875384707, -83.47052715529799))));
    dollarTemplates.push(new stroke("S", new Array(new point(114.16252936653348, 0), new point(114.86805494321118, -16.128317473884294), new point(118.31473759190715, -35.35982489732555), new point(122.66747412709287, -55.54932442951679), new point(125.28953614871125, -73.89322844771641), new point(127.91159817032974, -92.23713246591615), new point(129.6700000026957, -109.60391961565188), new point(129.89200708273108, -125.16527169299115), new point(127.07593487705583, -136.99061809387376), new point(116.83265364673616, -137.18621730969357), new point(97.37839374011435, -115.0843781952924), new point(81.12608993055164, -86.45087755537111), new point(62.376058001167166, -58.02641220027658), new point(42.9910975128214, -29.722204432222384), new point(23.913795805539507, -1.2624178030490611), new point(3.5383386946901965, 25.3098298053942), new point(-17.117101249776965, 49.318334469892534), new point(-36.98936004363986, 72.56716180534886), new point(-55.30377291545392, 88.58163501838783), new point(-73.37165649745566, 102.71815968467399), new point(-89.49611321750626, 112.81378269030643), new point(-98.60959648948392, 110.13827982671808), new point(-105.90330387628762, 104.54569326369369), new point(-111.5719547351863, 96.5730116482232), new point(-116.97300475675968, 88.24462893757891), new point(-118.07720535714395, 74.271788229918), new point(-117.65445103646505, 58.441227628392994), new point(-118.27776016464759, 43.86168649046169), new point(-118.62282946074743, 28.95777235397054), new point(-119.82420400679757, 15.145861808359427), new point(-120.10799291726886, 0.5856454757312122), new point(-120.10799291726886, 0.5856454757312122))));
    dollarTemplates.push(new stroke("arrow", new Array(new point(157.8365182111466, -1.7053025658242404e-13), new point(138.406348602275, -2.185482272591571), new point(118.92052219026408, -4.666920388252038), new point(99.33207382281245, -7.849392232651553), new point(79.81386164274488, -10.689709354913475), new point(61.80904188837525, -5.441548568080066), new point(43.00451278797675, -4.157202528048003), new point(23.82460018624829, -4.684999951509781), new point(4.679351751800368, -5.0139388534649925), new point(-14.763928445613118, -7.188572898343409), new point(-34.28128954038212, -9.866403471297986), new point(-54.04113602151105, -14.471524410809991), new point(-48.991165818578764, -0.879439439266207), new point(-32.195792229941446, 31.927463378109564), new point(-14.682485566286175, 62.99242201876234), new point(2.841421333024357, 92.8426892716243), new point(21.959394886298128, 118.53704994447776), new point(32.21123592508454, 136.8367840243934), new point(12.14230449559804, 122.72681840253733), new point(-8.17056592074917, 107.17897642670164), new point(-28.124086181985774, 86.7533957222281), new point(-45.337731251066515, 55.85413831116284), new point(-60.72686186517396, 21.353516802549393), new point(-75.78001460568746, -13.702636156298468), new point(-88.73006861319175, -51.3444164042956), new point(-92.16348178885339, -81.54239650181711), new point(-74.11036296009385, -86.2637067812222), new point(-56.468269768675185, -92.97477047396575), new point(-39.15410493945677, -100.89867195666017), new point(-21.322195660517338, -106.85508970784849), new point(-3.8688232729422225, -113.16321597560653), new point(-3.8688232729422225, -113.16321597560653))));
    dollarTemplates.push(new stroke("point", new Array(new point(81.53393739335633, 1.1368683772161603e-13), new point(81.66083797276099, 8.051716842346877), new point(80.63394435132977, 15.199866139814048), new point(79.35114955127375, 22.14788026490055), new point(79.35876286382933, 30.10841526086), new point(78.97718201902069, 37.75419962741921), new point(75.6593788893249, 43.0253907614225), new point(73.38152536585005, 49.158672483108774), new point(71.82594372063699, 55.890698398045174), new point(70.21128333536234, 62.57494217411522), new point(68.4369227980091, 69.13002248401028), new point(68.54510313628361, 77.15916524701288), new point(68.85303273747746, 85.34840304225662), new point(67.97400987820913, 92.61520351931125), new point(64.66102619179145, 95.9469269774591), new point(50.64679834244271, 80.49533463433801), new point(36.25817288126797, 64.88276795098733), new point(21.421827935472436, 49.204773976498245), new point(6.5854829896769616, 33.526780002009104), new point(-8.25086195611857, 17.84878602752002), new point(-23.0872069019141, 2.1707920530308797), new point(-37.72016726398823, -13.48799884646479), new point(-52.20268299512318, -29.132585131837686), new point(-66.68519872625805, -44.77717141721058), new point(-81.14256126440728, -60.418295555912266), new point(-95.35444052154617, -76.02563077864343), new point(-109.56631977868511, -91.63296600137465), new point(-123.77819903582406, -107.24030122410585), new point(-138.17847272260872, -122.86436123882066), new point(-153.331887132423, -138.55528162701236), new point(-168.339162027239, -154.05307302254084), new point(-168.33916202723904, -154.0530730225409))));
    dollarTemplates.push(new stroke("N", new Array(new point(-4.453295974007062, -1.1368683772161603e-13), new point(-14.428301618234798, 10.464579464675694), new point(-25.04366299432587, 21.558095734563324), new point(-38.1434568301799, 35.08907667964223), new point(-51.71650804596669, 49.08355758924756), new point(-65.82783621729232, 63.605217493574514), new point(-77.84586788000911, 76.07540248586344), new point(-88.26518218352345, 86.97617033345432), new point(-97.52157357801713, 96.73422596229511), new point(-102.88964531938257, 102.65899029603565), new point(-107.58224194173812, 107.9185562821026), new point(-105.34843865225878, 106.0274141676341), new point(-80.36796046680439, 80.95357038023582), new point(-55.44981941186171, 55.93797855764058), new point(-30.331260642724487, 30.73004495271988), new point(-5.236885080687728, 5.54528023662732), new point(19.76303449326946, -19.548990266771852), new point(45.29393730198677, -45.15122131792265), new point(71.2856171108507, -71.18557920950514), new point(98.68013609266245, -98.54173600449542), new point(124.97956654519362, -124.87557775168085), new point(142.41775805826194, -142.08144371789734), new point(122.91186772636695, -122.29792332998534), new point(103.45474373619606, -102.56154894061893), new point(82.51910824165839, -81.38806018439755), new point(62.4330442619717, -61.04119537597131), new point(46.24949738854451, -44.49357556840414), new point(32.33045127624007, -30.16090911793856), new point(19.735946233507832, -17.12518720317803), new point(6.756166453127037, -3.750730046663307), new point(-14.17946904141047, 17.422758709557968), new point(-14.17946904141047, 17.422758709557968))));
    dollarTemplates.push(new stroke("check", new Array(new point(115.61796160926724, 4.547473508864641e-13), new point(116.43054442006462, 18.110063541258114), new point(114.45066132268687, 30.676516816581398), new point(109.2947093327897, 36.718661446113174), new point(104.13875734289252, 42.76080607564472), new point(100.05877378068203, 51.04490589005036), new point(93.20705976664794, 53.381710863154694), new point(85.0013931250162, 52.81449037226548), new point(76.74029495545403, 51.98974618269153), new point(66.24848895063963, 46.43036700458492), new point(54.73533776812485, 38.50378923298308), new point(40.8802215248802, 25.206300169038514), new point(27.025105281635433, 11.908811105093719), new point(14.357739571846082, 1.3814484567715226), new point(3.7712786248173416, -4.407486222607076), new point(-7.028750692799349, -11.456659855091857), new point(-14.134128946789872, -9.702222085014), new point(-27.196494188315683, -21.178170424110476), new point(-43.18135949385811, -39.914309114479465), new point(-57.76314570392975, -55.00399157872516), new point(-73.21595640471759, -72.15699240910476), new point(-87.41515710202378, -86.38910008885932), new point(-99.92470339886103, -96.94556246332036), new point(-110.02042186785019, -103.72986674987965), new point(-122.79488438710672, -114.78104599280891), new point(-133.56945557993544, -121.8747102413497), new point(-114.22396619863463, -74.49141759995177), new point(-89.34899522204341, -20.61748621145898), new point(-65.77700865794822, 32.714356678073045), new point(-41.030039954951576, 82.75646768516845), new point(-17.666929788838843, 128.12528975865007), new point(-17.666929788838843, 128.12528975865007))));
    dollarTemplates.push(new stroke("a", new Array(new point(123.97269741791649, -1.1368683772161603e-13), new point(124.14038518795093, -28.782412727068788), new point(119.8283922865067, -55.93003594612037), new point(113.12906165575396, -81.58236552716744), new point(100.91350552360547, -103.79027201182964), new point(85.05961588979056, -122.64785054449698), new point(63.41925891831818, -134.61456191340187), new point(37.164557517303706, -137.18651785533035), new point(9.178079880738778, -134.08942888954203), new point(-18.67504201940062, -123.02988620025184), new point(-43.16418983301048, -101.54036262808563), new point(-67.38556750971316, -78.93538434376524), new point(-89.13953667486732, -53.45616079360781), new point(-98.71345497387586, -24.96642952925083), new point(-93.96940618761641, 0.9977267303479493), new point(-82.83313914104491, 23.943543228374438), new point(-68.6025461120937, 43.96539992785256), new point(-45.953633796580505, 53.737499354313115), new point(-18.88673684041106, 53.21510263892759), new point(8.467741593539756, 52.6462726845254), new point(34.20460309616573, 54.26255296970146), new point(59.91948856675663, 57.20786363551741), new point(85.84594439635936, 57.54587974671642), new point(72.8173340632261, 61.49559216746752), new point(44.57796958552325, 66.05515271562354), new point(16.299111019899783, 71.00672835965486), new point(-12.219214977866272, 78.33523820606604), new point(-40.736299239952984, 85.64582645760015), new point(-69.20206981769218, 92.30237635824324), new point(-97.7376798511304, 102.5619494396451), new point(-125.85961481204907, 112.81348214466959), new point(-125.85961481204907, 112.81348214466959))));
    dollarTemplates.push(new stroke("b", new Array(new point(161.74192234911408, 2.2737367544323206e-13), new point(148.24934403754014, -10.646681319359232), new point(134.7567657259662, -21.293362638718463), new point(121.26418741439227, -31.940043958077922), new point(107.77160910281833, -42.586725277437154), new point(94.2790307912444, -53.233406596796385), new point(80.7874022041571, -63.90243779329717), new point(67.34565734673174, -71.87288262224433), new point(53.850970071470186, -75.43409306974377), new point(40.35628279620852, -78.9953035172432), new point(26.861595520946906, -82.55651396474263), new point(13.941713253864492, -77.1911022675904), new point(0.6199631400453995, -77.68395929276994), new point(-12.777829580183806, -79.50524847535166), new point(-26.272516855445417, -83.0664589228511), new point(-39.73779118308093, -86.09950539847955), new point(-52.57880491372046, -80.34002259512067), new point(-65.0091808464398, -70.79316798843251), new point(-74.7753392017441, -48.61838247985884), new point(-82.6973421704747, -22.20523104204426), new point(-85.438826636664, 14.428608100421116), new point(-88.25807765088588, 52.32623637597021), new point(-87.08231594463413, 93.19967276607349), new point(-85.90655423838238, 134.07310915617654), new point(-76.75523276683411, 160.33928415402102), new point(-63.26054549157253, 163.90049460152045), new point(-51.155393717953814, 154.9824324583044), new point(-41.13780592028996, 133.1480213003963), new point(-33.88576218287338, 103.40568286931557), new point(-29.70282773631837, 71.82982598752756), new point(-27.69714835850135, 38.16558072521957), new point(-27.69714835850135, 38.16558072521957))));
    dollarTemplates.push(new stroke("I", new Array(new point(14.365481196138006, 2.842170943040401e-14), new point(30.422559119890764, 17.868629204696532), new point(46.34940172618059, 35.62194362521217), new point(61.77022393185342, 52.91839393333851), new point(75.67281880976259, 68.85331475367639), new point(89.82932191619028, 85.0161270684759), new point(102.51176855578387, 99.82344603166268), new point(116.72484219413042, 116.03149089617432), new point(103.17749962094251, 103.7828414944737), new point(88.61642666625357, 87.25384715146373), new point(73.32999319370106, 70.06630958380401), new point(58.0435597211486, 52.878772016144296), new point(42.122395531925946, 35.46841419530051), new point(33.13820963595367, 28.798947515623325), new point(16.025387997149096, 13.445772268985223), new point(-2.658109992903775, -3.737377122937062), new point(-19.252684585635137, -18.519602544092606), new point(-34.2185554176269, -31.664087915579643), new point(-53.99162315796025, -50.49380106805066), new point(-37.632253739235125, -32.39796165785657), new point(-22.345820266682637, -15.21042409019688), new point(-6.149546341008431, 2.774216929220586), new point(-7.381049305646712, 3.3870462048750767), new point(-24.841234654726577, -12.53389864886148), new point(-40.2488960166645, -29.687049061086498), new point(-56.593504229221, -47.809631818106965), new point(-72.12942391565969, -65.21835883318687), new point(-87.4158573882122, -82.40589640084661), new point(-102.70229086076469, -99.59343396850633), new point(-117.98872433331717, -116.78097153616604), new point(-133.27515780586964, -133.96850910382568), new point(-133.27515780586964, -133.96850910382568))));
    dollarTemplates.push(new stroke("f", new Array(new point(133.6801377285016, 5.684341886080802e-14), new point(107.47653891392068, 13.531035541930521), new point(80.63421951588592, 33.64755683838706), new point(53.9445908722617, 50.8224194754701), new point(27.515281669535796, 66.87910496371268), new point(1.139299769317887, 81.09773622036835), new point(-24.860673420906323, 92.80184783339138), new point(-49.75310519560341, 100.81222487372378), new point(-71.10474782712701, 99.4102816025001), new point(-89.98433366827999, 93.4354728361198), new point(-105.19329555929296, 81.65614774057178), new point(-116.31986227149842, 64.24218765368823), new point(-103.55459787133957, 35.97380964493112), new point(-80.04997039809156, 4.591687496933616), new point(-56.218509004766275, -25.304874458534698), new point(-29.742480682872696, -41.49503392666554), new point(-3.955250519802888, -56.78155368013944), new point(20.538237684484443, -63.938711152381074), new point(23.782147380771306, -58.20692597930935), new point(-2.7326006355529273, -41.96657444102209), new point(-24.689799884002923, -18.467398954934595), new point(-45.39524933730337, 3.9240598817859222), new point(-47.415514358611176, 30.046546619778837), new point(-21.557724752146783, 18.541257691345322), new point(4.5294761774716505, 4.652489002366963), new point(29.433501419218487, -3.5690224401890305), new point(47.38688916698638, -17.59285411841614), new point(55.165516311216265, -50.618106203585796), new point(62.41601646228034, -83.40924906198478), new point(70.01412824942983, -116.34001124728849), new point(77.43586703295787, -149.18777512627622), new point(77.43586703295787, -149.18777512627622))));
    dollarTemplates.push(new stroke("x", new Array(new point(-38.516256317359904, 0), new point(-41.63648053783231, 10.08948076798788), new point(-42.754365519385885, 18.228259940082694), new point(-42.155164221830006, 24.61436039391043), new point(-39.138119353398025, 28.484346189855387), new point(-37.06979169496134, 33.34738468994158), new point(-35.97535483141874, 39.22129758209746), new point(-32.77946700943093, 42.901172379651996), new point(-27.899142120303708, 44.76144893560553), new point(-21.73934972305156, 45.144832587841734), new point(-11.083421492217894, 40.06717109861489), new point(9.675149588312593, 17.978652396763778), new point(28.525356248420252, -4.151109987733832), new point(48.309361806696444, -27.084546772762877), new point(67.98553940056698, -49.956120575547175), new point(83.94025522034926, -70.80362808456988), new point(99.01873905957208, -91.1031078753229), new point(111.75744918280768, -109.72253181675902), new point(125.29557655599521, -128.93046567643077), new point(111.96106362868503, -118.33274206818368), new point(90.37133964197264, -96.52043931026756), new point(68.78884909925128, -74.37817550835445), new point(47.20161625211708, -52.6034004673443), new point(25.65027743261777, -30.972703361717606), new point(4.201092493005859, -9.967518083141613), new point(-17.362164273930603, 11.602322477753773), new point(-38.95283363075967, 33.423027160850665), new point(-60.539436088866694, 55.19582877507236), new point(-82.08555935826993, 77.43661530080243), new point(-103.5859125493439, 99.89122026416197), new point(-124.70442344400476, 121.06953432356926), new point(-124.70442344400476, 121.06953432356926))));
    //add new templates here One Dollar


    for (var i = 0; i < dollarTemplates.length; i++) {
        var distABA;

        distABA = distAtBestAngle(translatedResamp, dollarTemplates[i].pathArray); // no works

        if (distABA < ab) {
            ab = distABA;
            mtchVar = i;
        }
    }
    return dollarTemplates[mtchVar].name;
}

function distAtBestAngle(transltedResamp, testPoints) {
    var minTheta = -Math.PI / 4; //a
    var plusTheta = +Math.PI / 4; //b
    var deltaTheta = Math.PI / 180; //threshold

    var x1 = Phi * minTheta + (1.0 - Phi) * plusTheta;
    var f1 = distAtAngle(transltedResamp, testPoints, x1);
    var x2 = (1.0 - Phi) * minTheta + Phi * plusTheta;
    var f2 = distAtAngle(transltedResamp, testPoints, x2);
    while (Math.abs(plusTheta - minTheta) > deltaTheta) {
        if (f1 < f2) {
            plusTheta = x2;
            x2 = x1;
            f2 = f1;
            x1 = Phi * minTheta + (1.0 - Phi) * plusTheta;
            f1 = distAtAngle(transltedResamp, testPoints, x1);
        }
        else {
            minTheta = x1;
            x1 = x2;
            f1 = f2;
            x2 = (1.0 - Phi) * minTheta + Phi * plusTheta;
            f2 = distAtAngle(transltedResamp, testPoints, x2);
        }
    }
    return Math.min(f1, f2);
}

function distAtAngle(translatedResamp, testPoints, rads) {
    var newPts = rotateBy(translatedResamp, rads);
    var tmp = newPathLength(newPts, testPoints);
    return newPathLength(newPts, testPoints);
}

function rotateBy(translatedResamp, rads) {
    var cent = centroidCompute(translatedResamp);
    var cos = Math.cos(rads);
    var sin = Math.sin(rads);
    var newPoints = [];

    for (var i = 0; i < translatedResamp.length; i++) {
        var qx = (translatedResamp[i].x - cent.x) * cos - (translatedResamp[i].y - cent.y) * sin + cent.x;
        var qy = (translatedResamp[i].x - cent.x) * sin + (translatedResamp[i].y - cent.y) * cos + cent.y;
        newPoints.push(new point(qx, qy));
    }
    return newPoints;
}

function newPathLength(p1, p2) {
    var d = 0.0
    for (var x = 0; x < p1.length; ++x) {
        d += pointDistance(p1[x], p2[x]);
    }
    return d;
}

function pointDistance(po1, po2) {
    var dx = po2.x - po1.x;
    var dy = po2.y - po1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function generateDollarTemplate(translatedResamp) {
    //parse json 

    var intro = 'dollarTemplates.push(new stroke("name" , new Array(';
    var ending = ')));';
    var middle = "";
    for (x in translatedResamp) {
        if (x < 31) {
            middle += "new point(" + translatedResamp[x].x + "," + translatedResamp[x].y + "),";
        }
        else {
            middle += "new point(" + translatedResamp[x].x + "," + translatedResamp[x].y + ")";

        }
    }
    console.log("use to add new one dollar template (change placeholder name): \n" + intro + middle + ending);
}
////////////////////////////// begin pennypincher
function pPinTemplate(name, vectors) {
    this.name = name;
    this.vector = vectors;
}

function pennyPincher() {

    var pResamp = dollarResample();

    var pennyVectorize = pennyVectorize1(pResamp);

    pennytemplateGen(pennyVectorize);
    var pOutput = pMatch(pennyVectorize);

    return JSON.stringify(pOutput.name);

}

function pennyVectorize1(pResamp) {
    var vectorArray = [];
    var normVectorArray = [];
    for (var x = 1; x < pResamp.length - 1; ++x) {
        var vec = pSub(pResamp[x], pResamp[x - 1]);
        vectorArray.push(vec);
    }


    for (y in vectorArray) {
        var normVec = normal(vectorArray[y]);
        normVectorArray.push(normVec);
    }
    return normVectorArray;
}

function pMatch(penpin) {
    const pennypTemplates = [];
    pennypTemplates.push(new stroke("box", new Array(new point(1, 0), new point(0.9948377366945388, -0.1014784590368196), new point(0.9929204507566403, -0.11878122102937895), new point(0.9999874141039046, -0.005017134021139461), new point(1, 0), new point(0.9989820707500208, -0.045109004865997254), new point(0.9953278138807469, 0.09655331643901988), new point(0, 1), new point(-0.05630291817045353, 0.9984137325805827), new point(-0.07147971198729478, 0.9974420538428351), new point(-0.05234918265654739, 0.9986288414997793), new point(-0.08482348815743418, 0.996395993496966), new point(-0.05049942468472232, 0.9987240900801942), new point(0, 1), new point(0, 1), new point(-0.9790847316649417, 0.20345291401351037), new point(-0.9584811617473914, -0.28515585663873527), new point(-0.9832670295583423, -0.18217010891887295), new point(-0.9953223134692227, -0.09661000108826368), new point(-0.999988379153818, -0.0048209498358559), new point(-0.9958530153685766, -0.09097676506291931), new point(-0.995825093617469, -0.09128188715051304), new point(-0.9989736468062808, -0.04529517619526623), new point(-0.73781687646005, -0.6750009309702731), new point(0, -1), new point(0.040734681061792906, -0.9991699984280923), new point(0.004311757976788138, -0.9999907043283701), new point(0, -1), new point(0.04581747867122653, -0.9989498278933792), new point(0.3381251593285658, -0.9411011511144973))));
    pennypTemplates.push(new stroke("triangle", new Array(new point(0.41481600047900824, -0.9099053169130287), new point(0.43564699128513223, -0.9001176028632103), new point(0.3976648749963354, -0.9175307336510036), new point(0.3905464506927016, -0.9205832226644873), new point(0.4366054302107492, -0.8996530988722745), new point(0.4160878837154517, -0.9093244047231972), new point(0.3585558265219916, -0.9335082855910447), new point(0.3313409394896516, -0.9435110925782034), new point(0.4143568128307891, -0.9101145156850925), new point(0.6543309580088876, -0.7562083029107597), new point(0.384432637539063, 0.9231530464634558), new point(0.4374657188493065, 0.899235088745796), new point(0.4374657188493063, 0.899235088745796), new point(0.43746571884930674, 0.8992350887457959), new point(0.43746571884930546, 0.8992350887457965), new point(0.43746571884930713, 0.8992350887457957), new point(0.5011134354560982, 0.8653816064635224), new point(0.46155475416215097, 0.8871117229020911), new point(0.392753571388775, 0.9196437528528983), new point(0.4447517453944899, 0.8956538868159702), new point(0.4681221748565276, 0.883663753589336), new point(-0.9995103603255961, 0.0312896085273816), new point(-0.9997848459501077, 0.020742753156684328), new point(-0.9846579574817429, 0.17449557807544133), new point(-0.9884053027999771, 0.151838589946316), new point(-0.9864225721307919, 0.16422700505968124), new point(-0.9896704032187942, 0.14336140691535232), new point(-0.9993384696313626, 0.0363678857626609), new point(-1, 0), new point(-1, 0))));
    pennypTemplates.push(new stroke("S", new Array(new point(-0.948221653079364, 0.3176093459447289), new point(-0.9460896212966176, 0.3239049682774607), new point(-0.9668282971098758, 0.25542717926567193), new point(-0.9333456062030591, 0.3589790793088703), new point(-0.9783002013194082, 0.2071924614902899), new point(-0.9404353065563422, 0.3399726962305628), new point(-0.866944468339234, 0.498404743974215), new point(-0.8807755381167843, 0.4735340024275862), new point(-0.2042093854249438, 0.9789272326911571), new point(0.7044571773216107, 0.70974649370044), new point(0.8320502943378442, 0.5547001962252286), new point(0.8445581692346459, 0.5354638164983916), new point(0.8678080567355599, 0.4968995639612206), new point(0.919145030018058, 0.39391929857916735), new point(0.9810525156047714, 0.19374199757809338), new point(0.9429903335828896, 0.3328201177351371), new point(0.9680168181976349, 0.2508853118190207), new point(0.972468312015717, 0.23303515212367007), new point(0.8872132113677343, 0.46135964016648895), new point(0.48974118330282335, 0.8718678646315337), new point(0, 1), new point(-0.4447411727251724, 0.8956591367719297), new point(-0.6482266936738019, 0.7614474069879882), new point(-0.7946966252540935, 0.6070068152910268), new point(-0.9088550890985488, 0.4171120077625057), new point(-0.953310294316636, 0.3019925210165454), new point(-0.9942637853246165, 0.10695571603222123), new point(-0.9444113012960992, -0.3287663212438413), new point(-0.9245244425652466, -0.3811227559454044), new point(-0.8994018382707641, -0.43712278974582186))));
    pennypTemplates.push(new stroke("arrow", new Array(new point(-0.1225640431124139, -0.9924606064403455), new point(-0.11528127275891743, -0.9933328888902674), new point(-0.09792521892632258, -0.9951937758538443), new point(-0.10632541241081657, -0.9943313867497444), new point(-0.30320365727694704, -0.9529257800132618), new point(-0.2077376876102038, -0.9781845700819276), new point(-0.16340145269660378, -0.9865596612758092), new point(-0.1682750845557012, -0.9857400752316869), new point(-0.12287363997739134, -0.992422323710378), new point(-0.11043152607484805, -0.9938837346736187), new point(-0.06244118080485058, -0.9980486455778075), new point(-0.8424754471118089, 0.5387347408639597), new point(-0.7010068052412813, 0.71315458282578), new point(-0.6501574727855792, 0.7597994870892377), new point(-0.6280747537438037, 0.7781530079037542), new point(-0.4953187027269952, 0.8687113345230661), new point(-0.6535651935080814, 0.7568702252267188), new point(0.1852701672578168, -0.9826876233698381), new point(0.2181799274852604, -0.9759085609023657), new point(0.34974504819436575, -0.9368449184702453), new point(0.6565816281435423, -0.7542549738545815), new point(0.7678015800938605, -0.6406877036477064), new point(0.7847511250130832, -0.619810996829437), new point(0.8686047043885528, -0.4955056684984287), new point(0.99887195272169, -0.04748496673640923), new point(0.2910492096982777, 0.95670808376119), new point(0.3380386576528566, 0.9411322255306396), new point(0.3668084467870223, 0.9302964921817625), new point(0.3201023751968476, 0.9473829581501542), new point(0.33076022222483936, 0.9437148273677672))));
    pennypTemplates.push(new stroke("point", new Array(new point(0.8715755371245493, 0.49026123963255885), new point(0.8376545314961646, 0.546200408150654), new point(0.8296436519648458, 0.5582933017280736), new point(0.8682431421244586, 0.49613893835683487), new point(0.8570744216122221, 0.5151926201122012), new point(0.7592566023652961, 0.6507913734559692), new point(0.7966167654835563, 0.604484680492828), new point(0.820905201785488, 0.5710644881985985), new point(0.8189810642445751, 0.5738205437319436), new point(0.8137334712067343, 0.5812381937190972), new point(0.8710583315006852, 0.49117958337378226), new point(0.8765572034455195, 0.4812976927929016), new point(0.8422160475983164, 0.5391401758057643), new point(0.7188830201833274, 0.6951310691460264), new point(-0.9172000316411801, 0.39842703467186846), new point(-0.9067830071353243, 0.4215976493893418), new point(-0.8877545314489306, 0.46031716445499804), new point(-0.8877545314489286, 0.4603171644550018), new point(-0.8877545314489295, 0.460317164455), new point(-0.8877545314489291, 0.46031716445500087), new point(-0.8970837951958405, 0.44186045806003893), new point(-0.903737838893538, 0.42808634473904605), new point(-0.9037378388935391, 0.4280863447390442), new point(-0.9047818247360231, 0.4258753921364232), new point(-0.9146866040947624, 0.4041638483209395), new point(-0.9146866040947603, 0.4041638483209443), new point(-0.9146866040947624, 0.4041638483209395), new point(-0.9067334023004264, 0.42170432432297045), new point(-0.8715755371245493, 0.49026123963255885), new point(-0.8693273534042458, 0.4942367374276922))));
    pennypTemplates.push(new stroke("N", new Array(new point(0.42140390750089285, -0.9068730598837849), new point(0.4005518614201894, -0.916274089076419), new point(0.316227766016839, -0.9486832980505134), new point(0.2993318915236302, -0.9541490547691622), new point(0.27999999999999975, -0.96), new point(0.35360327361763, -0.9353954911623722), new point(0.4068588162167817, -0.913491052866244), new point(0.44419599510877245, -0.8959296389389779), new point(0.5590360316616612, -0.8291433623348753), new point(0.578242286092192, -0.8158650982698522), new point(0.7952234851721656, -0.6063164261593402), new point(0.21362315717195418, 0.9769161410888278), new point(0.20797191091070602, 0.9781347986203892), new point(0.21951219512195216, 0.9756097560975607), new point(0.21806943135179632, 0.9759332575078606), new point(0.2124296443310448, 0.9771763639228007), new point(0.24502374451546624, 0.969517078046395), new point(0.28471837872248784, 0.9586112062862805), new point(0.3957240985676178, 0.918369445165096), new point(0.2964786316473487, 0.9550394866059286), new point(0.8167242108370368, 0.5770282171892631), new point(0.06288106945296729, -0.9980210273859219), new point(0.06530122974236559, -0.9978655968586826), new point(0, -1), new point(0.03660615215359273, -0.9993297702082672), new point(0.20188109990250952, -0.9794100374726373), new point(0.28643569867796537, -0.9580994679692009), new point(0.33389797831311857, -0.9426092191774978), new point(0.2932115739940727, -0.95604757877206), new point(0, -1))));
    pennypTemplates.push(new stroke("check", new Array(new point(0.826203872356625, 0.5633712464289581), new point(0.761110804754709, 0.648621879746312), new point(0.6757246285173462, 0.7371541402007415), new point(0.6757246285173453, 0.7371541402007423), new point(0.7060480655293154, 0.7081639140497852), new point(0.6235640660968703, 0.7817722529437446), new point(0.5802973184825004, 0.8144047041625063), new point(0.5762817968620979, 0.8172510572678335), new point(0.5023234702005909, 0.8646797854036117), new point(0.46316222771177396, 0.8862735191920532), new point(0.37139067635410566, 0.9284766908852586), new point(0.3713906763541037, 0.9284766908852593), new point(0.41961741409486736, 0.9077010663144209), new point(0.4985279995096266, 0.8668735973052414), new point(0.4727564188863185, 0.8811931504510142), new point(0.6150808895393259, 0.7884640127003334), new point(0.4029325322215903, 0.9152296840015064), new point(0.26623498428531644, 0.9639081559685017), new point(0.33835432743925414, 0.9410187825453485), new point(0.3009182371268782, 0.9536499434092427), new point(0.35315636741098916, 0.9355643110749119), new point(0.4152349004011822, 0.9097142284744261), new point(0.46764162745264715, 0.8839181569995265), new point(0.40778234018191284, 0.9130791658097138), new point(0.4712675883713838, 0.8819902834785766), new point(0.9571328176770361, -0.2896493903422161), new point(0.8011486569789623, -0.5984653953411215), new point(0.8732902650369627, -0.487200280163786), new point(0.653224003616812, -0.7571647120005152), new point(0.5526247152943635, -0.8334302154624726))));
    pennypTemplates.push(new stroke("a", new Array(new point(-0.9894274375197134, 0.14502877605211145), new point(-0.9544419627885269, 0.2983966147066421), new point(-0.9247429868602204, 0.38059218101905107), new point(-0.8289781955818355, 0.5592809233738302), new point(-0.7368260819429542, 0.6760823359388966), new point(-0.5302275446682987, 0.8478553832317322), new point(-0.23500576174291812, 0.9719939773206575), new point(-0.04873187161794367, 0.9988118965494014), new point(0.22988378089572312, 0.9732180882418324), new point(0.6124947879313476, 0.7904746262574995), new point(0.6445074870767716, 0.7645979983638364), new point(0.7541524937739023, 0.6566993346536939), new point(0.9777416006920454, 0.20981268378283735), new point(0.9479190497391801, -0.31851134224948674), new point(0.8507794274651622, -0.5255229450766644), new point(0.7765009749551689, -0.6301160495445836), new point(0.4666130278630191, -0.8844615775874638), new point(0.13353164113762986, -0.9910445503684944), new point(0.13218052330042163, -0.9912256601097585), new point(0.20557122194608654, -0.9786421576386298), new point(0.24856597803808594, -0.9686149671370816), new point(0.16243143287186268, -0.9867198333950695), new point(0.1386935915013117, 0.9903353410216498), new point(0, 1), new point(0.013221764950589575, 0.9999125886454232), new point(0.0933407086930585, 0.9956342260592881), new point(0.09273419888826939, 0.9956909000069002), new point(0.07062373137716374, 0.9975030268457166), new point(0.19370923043387092, 0.9810589860170068), new point(0.1985566833200925, 0.9800894058752622))));
    pennypTemplates.push(new stroke("b", new Array(new point(-0.17469122462117828, 0.9846232660466403), new point(-0.17469122462117828, 0.9846232660466403), new point(-0.17469122462117828, 0.9846232660466403), new point(-0.17469122462117828, 0.9846232660466403), new point(-0.17469122462117828, 0.9846232660466403), new point(-0.17525182778868043, 0.9845236395621624), new point(-0.10985963433828332, 0.9939471116427969), new point(0, 1), new point(0, 1), new point(0, 1), new point(0.21634193734637283, 0.9763176563727698), new point(0.07478290658329627, 0.9971998379878299), new point(0.04237400688167778, 0.9991018184053073), new point(0, 1), new point(0.01284200282302301, 0.9999175380817629), new point(0.2261962883824087, 0.9740817414991528), new point(0.31622776601683744, 0.9486832980505139), new point(0.617703944844231, 0.7864107301683231), new point(0.734999302308381, 0.6780678620950807), new point(0.9557730889657685, 0.2941050873562595), new point(0.9561170411094604, 0.2929849888647721), new point(1, 0), new point(1, 0), new point(0.684109144874417, -0.7293796527866636), new point(0, -1), new point(-0.3077989298475894, -0.9514514274437127), new point(-0.6046516167797175, -0.7964900641726008), new point(-0.7901338513657559, -0.6129343332902127), new point(-0.9043710653987794, -0.42674696960784236), new point(-0.9670069885647146, -0.25474984605883844))));
    pennypTemplates.push(new stroke("I", new Array(new point(0.9988582441397453, -0.047772461879881746), new point(0.9992096333512466, -0.039750580097243395), new point(0.9999407308581175, -0.010887367493287439), new point(0.9969511334856216, 0.07802843995450873), new point(0.9979959890823974, 0.06327721371431626), new point(0.9899770438901274, 0.14122837027511376), new point(0.9982782532812204, 0.058656022928557774), new point(-0.035371922683258346, 0.9993742177411271), new point(-0.9991817180329877, -0.04044619078043115), new point(-1, 0), new point(-1, 0), new point(-0.9903078072037187, 0.13889005360846515), new point(0.4131592598692826, 0.9106587868045125), new point(0, 1), new point(-0.12226863753482001, 0.9924970429554835), new point(0.030597520220348836, 0.9995317862661324), new point(0.08556259922240571, 0.9963327966168263), new point(-0.33753552422140476, 0.9413127906751195), new point(0.9969807514422213, -0.0776490904885807), new point(1, 0), new point(0.9982977021823933, -0.05832407579510702), new point(0.6935333146964514, 0.7204245563597572), new point(-0.0770404923975311, 0.9970279647688655), new point(-0.9989532457516942, 0.0457428989260142), new point(-0.9978428310525171, 0.0656481874623953), new point(-0.99988342870685, 0.015268562389230423), new point(-1, 0), new point(-1, 0), new point(-1, 0), new point(-1, 0))));
    pennypTemplates.push(new stroke("f", new Array(new point(-0.09630239735983305, -0.9953521227499085), new point(-0.30897833243995526, -0.9510690774505416), new point(-0.21239327937458632, -0.9771842686394971), new point(-0.1793753525221202, -0.9837807087494475), new point(-0.11684149526568387, -0.9931505751818699), new point(-0.037246044676826705, -0.9993061253469487), new point(0.07186678713737485, -0.9974142393742689), new point(0.3395672507550869, -0.9405817785895237), new point(0.46200055047536415, -0.8868796374708694), new point(0.610259687938818, -0.792201434785886), new point(0.7416491866072542, -0.6707879575579739), new point(0.9506139674514131, 0.31037571568388467), new point(0.7303090454122632, 0.6831168993583959), new point(0.6881048479730759, 0.7256112720981877), new point(0.18301711998104972, 0.9831097262227865), new point(0.1658618328279876, 0.9861490011204903), new point(-0.09576535553719424, 0.9954039364392904), new point(-0.7620085371374629, 0.6475669767133159), new point(-0.1839347458369088, -0.982938456503718), new point(-0.5716017386617768, -0.8205312013316944), new point(-0.57948605855067, -0.8149821519183162), new point(-0.9759828581059398, 0.21784733343183493), new point(0.03266345046908791, 0.9994664071410572), new point(0.11078553104454603, 0.9938443369618694), new point(-0.06504878791711013, 0.9978820848128874), new point(0.3373722434120636, 0.9413713238542543), new point(0.9999094655992938, -0.013455876223216276), new point(0.9994288325812923, -0.03379361781749747), new point(0.9997946562193639, -0.02026438736315404), new point(0.9996350710015225, -0.02701341932782477))));
    pennypTemplates.push(new stroke("x", new Array(new point(0.46662433206379006, -0.8844556137681652), new point(0.5472977590047237, -0.8369379684232324), new point(0.6121082161725847, -0.7907740079782695), new point(0.6969673539643235, -0.7171028569933111), new point(0.66463938927494, -0.7471642939971332), new point(0.6301391561791262, -0.7764822237822697), new point(0.7029432592108216, -0.711245930976106), new point(0.7572235444262437, -0.6531558035924939), new point(0.7974666062895147, -0.6033630845959043), new point(0.9214025414238437, -0.3886095169417266), new point(0.7149486836086243, 0.6991769302589262), new point(0.47065997933654224, 0.8823146739406105), new point(0.5034879171058723, 0.864002266969474), new point(0.49632921324140317, 0.8681343859582856), new point(0.21017340432449932, 0.9776641243876398), new point(0.1472473705375595, 0.9890996976391079), new point(0, 1), new point(0.04893353434289592, 0.9988020370507424), new point(-0.9995436373032336, -0.030207898414517997), new point(-0.8198430184219822, -0.5725883557537068), new point(-0.7913500438935416, -0.6113633191725604), new point(-0.8226914650704803, -0.5684881294276837), new point(-0.8313476312960341, -0.5557527471263397), new point(-0.8704547685215395, -0.49224840879185483), new point(-0.8370705963591671, -0.5470948882149314), new point(-0.8192345302869724, -0.573458616105368), new point(-0.8227998706163744, -0.568331217613178), new point(-0.7793469324781326, -0.6265926578223886), new point(-0.7554790981912581, -0.6551727498882437), new point(-0.8327979591182739, -0.553577058130517))));
    //add new template here penny pincher

    var highScore = -Infinity;
    var topScore = 0.0;

    for (x = 0; x < pennypTemplates.length; ++x) {
        var score = 0.0;
        for (y = 0; y < pennypTemplates[x].pathArray.length; y++) {

            score += (pennypTemplates[x].pathArray[y].x * penpin[y].x) + (pennypTemplates[x].pathArray[y].y * penpin[y].y);
        }
        if (score > highScore) {
            highScore = score;
            topScore = pennypTemplates[x];
        }
    }
    return topScore;
}

function pSub(po1, po2) {
    return new point(po1.x - po2.x, po1.y - po2.y);
}

function normal(vectori) {
    var length = Math.sqrt(vectori.x * vectori.x + vectori.y * vectori.y);
    return new point(vectori.x / length, vectori.y / length);
}

function pennytemplateGen(pennyVectorize) {
    var intro = 'pennypTemplates.push(new stroke("name" , new Array(';
    var ending = ')));';
    var middle = "";
    for (x in pennyVectorize) {
        if (x < 29) {
            middle += "new point(" + pennyVectorize[x].x + "," + pennyVectorize[x].y + "),";
        }
        else {
            middle += "new point(" + pennyVectorize[x].x + "," + pennyVectorize[x].y + ")";
        }
    }
    console.log("use to add new penny pincher template (change placeholder name): \n" + intro + middle + ending);
}

/////////////////////Begin One Cent
function oneCent() {

    var ocResample = dollarResample();

    var centdistance = getCentroidDist(ocResample);

    var zNor = zNormalization(centdistance);

    oneCTempGen(zNor);

    var ocRecog = ocRecognize(zNor);

    return ocRecog;
}


function getCentroidDist(ocResample) {
    var centroid = centroidCompute(ocResample);
    var dists = [];

    for (var x = 0; x < ocResample.length; ++x) {
        var curDist = Math.sqrt(Math.pow((centroid.x - ocResample[x].x), 2) + Math.pow((centroid.y - ocResample[x].y), 2));
        dists.push(curDist);
    }
    return dists;
}

function zNormalization(centDistance) {
    var zScs = [];
    var avg = ocAvg(centDistance);
    var stdDev = ocStdDev(centDistance, avg);

    for (var x = 0; x < centDistance.length; ++x) {
        var zScore = (centDistance[x] - avg) / stdDev;
        zScs.push(zScore);

    }
    return zScs;
}

function ocAvg(centDistance) {
    var avg;
    var tmp = 0.0;
    for (var x = 0; x < centDistance.length; ++x) {
        tmp += centDistance[x];
    }
    var avg = tmp / centDistance.length;
    return avg;
}

function ocStdDev(centDistances, avg) {
    var squaredDiff = centDistances.map(num => Math.pow(num - avg, 2));
    var meanOSD = squaredDiff.reduce((sum, num) => sum + num, 0) / centDistances.length;
    const stDev = Math.sqrt(meanOSD);
    return stDev;
}

function ocRecognize(zNor) {
    const oneCentTemplates = [];
    oneCentTemplates.push(new stroke("box", new Array(1.1743983304535355, 0.030633056486736414, -0.6505176114348812, -1.1702896070508313, -1.3755222844713881, -1.091772423576748, -0.36710410627918566, 0.7001955957338715, 2.010968542210469, 1.30840849121856, 0.28820246918871945, -0.4175400334948389, -0.8345709363356696, -0.7367164924068877, -0.14633162916946316, 0.8016839735959611, 1.889320960377213, 0.5477405400608725, -0.5547559276948629, -1.3146229470218842, -1.625227906328925, -1.5264138332903312, -1.0085951391729846, 0.04830450452698407, 1.3121594232168314, 1.5919900066412978, 0.5998567771287713, -0.07226386484435292, -0.3494841626857728, -0.11031111689419548, 0.5240886756566943, 0.5240886756566943)));
    oneCentTemplates.push(new stroke("triangle", new Array(-0.08406725834086366, -0.7152830720228834, -1.25821194336032, -1.4706418095129647, -1.3104476539116177, -0.9277016136343575, -0.4195083224163409, 0.14922451058366198, 0.7554670323711503, 1.3892317779097505, 2.0221792065364887, 1.682531633976417, 1.0441906831918284, 0.3769249088803647, -0.2810126229672802, -0.8760567066493669, -1.3911152600534034, -1.6803759543714734, -1.547848013377595, -1.101257316481818, -0.5187001084908276, 0.09238236136825878, 0.6384904083220801, 1.2997379278262877, 0.915111820869683, 0.5584894774190816, 0.23674050695904314, 0.1624976519238092, 0.24525050685543923, 0.4493763378769515, 0.7822004513604033, 0.7822004513604033)));
    oneCentTemplates.push(new stroke("S", new Array(1.6695898421172208, 1.3883812756279317, 1.1129896691949446, 0.8577834858489441, 0.6606863479798808, 0.5319854081740168, 0.41580586617940934, 0.29966394620069803, -0.1061509951390346, -0.5800692415882133, -1.0445958396707986, -1.4312809055561342, -1.7397414146709964, -1.8734687414707256, -1.7500525554762423, -1.4496907716410974, -1.109301343764485, -0.7762206043420731, -0.4909206748846637, -0.24266330420734172, 0.05264483852935229, -0.0613924780154727, -0.11276893901989293, -0.11236914843688882, -0.04664356090934018, 0.08260937340231363, 0.2838333104801407, 0.5568437077090197, 0.8523470818862489, 1.1649193898913697, 1.4986234877859654, 1.4986234877859677)));
    oneCentTemplates.push(new stroke("arrow", new Array(2.727326947952239, 2.1576614284653566, 1.5890285896387513, 1.0247321761942676, 0.45635705660547576, -0.1089556886023192, -0.668685476894166, -1.2320090178109002, -1.6867987319637532, -1.2447165946956649, -0.6807465991023842, -0.6413950567856207, -1.1584112211809137, -1.2963859728646958, -0.9389132515172315, -0.47106176008790024, -0.21223207702975186, -0.5474778976060536, -0.7493154684282343, -0.6873511758400297, -0.39431650642621763, -0.056542704969661566, 0.3016975502601495, 0.7558089110242994, 1.1233895423057838, 0.766303590754105, 0.44375155265609906, 0.20522390189802198, 0.11745608240563947, 0.204141085974821, 0.4512183928352484, 0.4512183928352484)));
    oneCentTemplates.push(new stroke("point", new Array(2.209171844733263, 1.7080980841371753, 1.2254725233276753, 0.7779672697086754, 0.3083626618834718, -0.13618301885478765, -0.532470586154896, -0.8566094830559474, -1.0812253495255606, -1.1897199204617508, -1.139899807983086, -0.9424087546551086, -0.6304448387592192, -0.24662345778784983, 0.1830605303895198, 0.6544751698365207, 0.512985821750485, 0.05320521998948545, -0.3527269317908253, -0.7024318361354991, -0.9741924612612753, -1.1610493038607033, -1.1981117247702149, -1.0766410342790662, -0.8245969632571025, -0.48174917890516233, -0.07841145155944947, 0.3609562858826281, 0.8236439483703544, 1.3044459311427896, 1.741825405952729, 1.7418254059527278)));
    oneCentTemplates.push(new stroke("N", new Array(2.3433264202546984, 1.7810805878421907, 1.2041560394465554, 0.6951426976139625, 0.2814713385153913, -0.03228392293050315, -0.23172745984316948, -0.23439457711681846, -0.06264921718941997, 0.2816870249133762, 0.6803027617736932, 0.7989912625977228, 0.10040985375734297, -0.6203709706339062, -1.3061545349719965, -1.8961167895690498, -2.151249413699042, -1.7881163870096142, -1.1794481929345417, -0.48376218473692195, 0.23198561946751012, 0.8939879089617319, 1.0430700780658855, 0.43270361564086923, -0.10439703103451412, -0.5181456877486621, -0.7365796642463391, -0.7007169616068099, -0.42157121762946187, 0.11786340333268387, 0.7907528003585754, 0.7907528003585754)));
    oneCentTemplates.push(new stroke("check", new Array(1.8549192075049752, 1.606908348867271, 1.3580561100036972, 1.1091757144179577, 0.8605360333349285, 0.6121721730478721, 0.36343832608676047, 0.11458507937378634, -0.1337698929012873, -0.38142904720255405, -0.6295468633919766, -0.8781943157206975, -1.126539326840525, -1.3741294073917523, -1.620485595793323, -1.8155047347451503, -1.5913967414287975, -1.3447699314909503, -1.096060976267389, -0.8469385590153026, -0.5981155093351253, -0.3500675956578548, -0.10136870172876418, 0.14766143492629855, 0.39663725200329447, 0.6455339068809178, 0.887732072738902, 0.8608361465402834, 0.7796581429529192, 0.7599026849960969, 0.7652822826177479, 0.7652822826177479)));
    oneCentTemplates.push(new stroke("a", new Array(-0.556866076867729, -0.2986867952279801, -0.008929569867752415, 0.4489188399354327, 1.0262953717425993, 1.649007655506079, 2.103581658551317, 1.9755136566143958, 1.4937450616467873, 1.0242695668147952, 0.49651238537602577, 0.0424998181744831, -0.37999252013107954, -0.7751976623337546, -1.2269653546609922, -1.4315200489447044, -1.333740661390674, -0.962810439004733, -0.5415012686388034, -0.6909389300270724, -1.1552676650658986, -1.344586954411757, -1.0385267869305121, -0.7685629978631406, -0.14886744297295287, -0.09360626616170843, -0.30379829887320414, -0.18982713150543268, 0.10872342140745214, 0.5572198515675222, 1.16195279177149, 1.16195279177149)));
    oneCentTemplates.push(new stroke("b", new Array(2.6758672254660083, 2.2113662808061436, 1.7461336175705788, 1.283341248500959, 0.8203081304872591, 0.37401085008659213, -0.050532386189603026, -0.4567426859278128, -0.7940489957670295, -0.9583919732249513, -1.0986085651531772, -1.1550489024838926, -1.0784866696389241, -0.890305371788078, -0.6499075700008253, -0.39263111838379017, -0.16607129542224194, 0.12496976131815311, 0.4236765825673007, 0.6041811112227451, 0.6707772780841343, 0.6357683233158645, 0.535769860460443, 0.4228868684385366, 0.2241217510743464, 0.031024668653623525, -0.18545345581059855, -0.41482777096153783, -0.6551996538664958, -1.0177757290887461, -1.4100857071724964, -1.4100857071724964)));
    oneCentTemplates.push(new stroke("I", new Array(1.142390587592421, 0.7461481535456334, 0.46902552684425375, 0.37799558790817045, 0.43007709774378966, 0.637412780544933, 0.9141335364348752, 0.8720668256608505, 0.37710030754705365, -0.1379368214064524, -0.5330018032547205, -0.6617984795185983, -0.6029158199288938, -1.1515277247591682, -1.8550106930212633, -2.433912993191398, -1.9006843019574966, -1.2626138763509138, -0.8379120040999195, -0.7531202324255131, -0.5234662778238937, -0.03963641511343198, 0.45996520768562876, 0.16915724247006175, 0.03206232837774422, 0.004294580917293307, 0.09745024642509587, 0.3787302032396999, 0.7763911827179533, 1.2450494619714165, 1.782043292612393, 1.7820432926123937)));
    oneCentTemplates.push(new stroke("f", new Array(2.8248725732631463, 2.2001397912794856, 1.6003267195606279, 1.015153043645245, 0.4413676158988049, -0.05560076528250446, -0.5339838515775223, -0.7899395531725562, -0.8262815498650663, -0.5511334925068927, -0.09428388849627563, 0.3700884889250763, 0.8019159703440103, 1.115138363359696, 0.9892827625666564, 0.6577705127777288, 0.2669695411381654, -0.15837287777049436, -0.4359163569766401, -0.7248783609522106, -0.6467520667801063, -0.3588807081312945, -0.012317416610285865, -0.3738140156063786, -1.0054084533655356, -1.6374265215627508, -1.7559741668419153, -1.1221120228809867, -0.5666732908765159, -0.41501970556504336, -0.10912815896883003, -0.10912815896883003)));
    oneCentTemplates.push(new stroke("x", new Array(1.2618549107076351, 0.5993435001420891, -0.07907582096981464, -0.6606275339614094, -1.0995243689020027, -1.2064149789924155, -1.0559929921385063, -0.6670469016275599, -0.25095948294116993, 0.024809581101633518, -0.05793309202510256, -0.021086148466558423, 0.13938536843988672, 0.30170130277306095, 0.5210856072855168, 0.7916702837143973, 1.1006074165858748, 1.4702465657352732, 1.5535334989078424, 1.0491427833310056, 0.5217953041800435, -0.1418005314134418, -0.817492521824021, -1.4409461749969927, -1.902633456923904, -1.835713929997745, -1.3288594607584403, -0.651302020106085, 0.057141897129306056, 0.8125573132604692, 1.5062670413755677, 1.5062670413755677)));
    //add new template here one cent

    var b = +Infinity;
    var template;
    for (var x = 0; x < oneCentTemplates.length; ++x) {
        var d = ocLtwo(zNor, oneCentTemplates[x]);
        if (d < b) {
            b = d;
            template = x;
        }

    }
    return oneCentTemplates[template].name;
}

function ocLtwo(zNor, oneCentTemplate) {
    var d = 0.0;
    for (var x = 0; x < zNor.length; ++x) {
        d += (zNor[x] - oneCentTemplate.pathArray[x]) * (zNor[x] - oneCentTemplate.pathArray[x]);
    }
    return d;
}

function oneCTempGen(cVectorize) {
    var intro = 'oneCentTemplates.push(new stroke("name" , new Array(';
    var ending = ')));';
    var middle = "";
    for (x in cVectorize) {

        if (x < 31) {
            middle += cVectorize[x] + ",";
        }
        else {
            middle += cVectorize[x];
        }
    }
    console.log("use to add new one cent template (change placeholder name): \n" + intro + middle + ending);
}
