const DEFAULT_TEXT = '#EXTM3U\n#EXT-X-VERSION:3\n';

const REFRESH_INTERVAL = 10; // seconds
let liveCourses = [];
let courses = ['mm300', 'mas134', 'ikt204', 'beta', 'ikt520', 'byg222'];
const spawnStream = courseCode => {
    const video = document.createElement('video');
    video.className = 'col';
    video.setAttribute('controls', true);

    const videoSrc =
        'https://live.uia.no/live/ngrp:' +
        courseCode +
        '_all/playlist.m3u8';

    const hls = new Hls();
    hls.loadSource(videoSrc);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
    });

    const cv = document.createElement('canvas');
    cv.className = 'audioMeter';
    cv.width = 640;
    cv.height = 20;

    const context = cv.getContext('2d');
    const audioCtx = new window.AudioContext();
    const sourceNode = audioCtx.createMediaElementSource(video);
    const meter = createAudioMeter(audioCtx);
    sourceNode.connect(meter);

    const onLevelChange = time => {
        context.clearRect(0, 0, 640, 200);

        if (meter.checkClipping()) {
            context.fillStyle = 'red';
        } else {
            context.fillStyle = 'green';
        }

        context.fillRect(0, 0, meter.volume * 640, 200);
        window.requestAnimationFrame(onLevelChange);
    };
    onLevelChange();

    const muteButton = document.createElement('button');
    muteButton.className = 'muteButton';
    muteButton.innerHTML = 'unmute';
    let muted = true;
    muteButton.addEventListener('click', () => {
        if (muted) {
            sourceNode.connect(audioCtx.destination);
            muted = false;
            muteButton.innerHTML = 'mute';
        } else {
            sourceNode.disconnect(audioCtx.destination);
            muted = true;
            muteButton.innerHTML = 'unmute';
        }
    });

    const title = document.createElement('div');
    title.className = 'title';
    title.innerHTML = courseCode;
    title.appendChild(muteButton);

    const container = document.createElement('div');
    container.appendChild(title);
    container.appendChild(video);
    container.appendChild(cv);

    document.body.appendChild(container);
};

const isLive = async courseCode => {
    const resp = await fetch(
        `https://live.uia.no/live/ngrp:${courseCode}_all/playlist.m3u8`
    );
    const blob = await resp.blob();
    const text = await blob.text();

    return text !== DEFAULT_TEXT;
};

const checkStreams = async () => {
    let currentCourses = [];

    await Promise.all(
        courses.map(async courseCode => {
            if (await isLive(courseCode)) {
                currentCourses.push(courseCode);
            }
        })
    );

    if (!currentCourses.every(val => liveCourses.includes(val))) {
        liveCourses = currentCourses;

        //document.body.innerHTML = '';
        liveCourses.map(courseCode => spawnStream(courseCode));
    }

    if (liveCourses.length === 0) {
        document.body.innerHTML = 'No streams live at the moment';
    }

    setTimeout(async () => {
        await checkStreams();
    }, REFRESH_INTERVAL * 1000);
};

checkStreams();
