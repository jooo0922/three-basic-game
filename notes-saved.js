'use strict';

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

import {
  OrbitControls
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/OrbitControls.js';

import {
  GLTFLoader
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/loaders/GLTFLoader.js';

import {
  SkeletonUtils
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/utils/SkeletonUtils.js';

function main() {
  // create WebGLRenderer
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });

  // create camera
  const fov = 45;
  const aspect = 2;
  const near = 0.1
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 40, 80);

  // create OrbitControls
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 5, 0);
  controls.update();

  // create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('white');

  // DirectionalLight를 생성하여 씬에 추가하는 함수
  function addLight(...pos) {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...pos);
    scene.add(light);
    scene.add(light.target); // target값은 별도로 지정 안해주면 (0, 0, 0)을 향하도록 씬에 추가됨.
  }
  addLight(5, 5, 2);
  addLight(-5, 5, 5); // 조명을 두 개 생성함

  // LoadingManager를 이용해서 GLTFloader가 여러 개를 로드할 때나 로드를 완료할 때 호출할 함수들을 정의해 줌. 
  const manager = new THREE.LoadingManager();
  manager.onLoad = init; // 로드를 완료하면 호출할 함수

  const progressBarElem = document.querySelector('#progressbar');
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    // 프로그래스 바 요소를 가져온 다음, loadingManager의 onProgress(gltf가 하나씩 로딩될 때마다 호출)에 현재 함수를 지정함.
    // onProgress에 지정하는 콜백함수는 gltf url, 현재까지 로드된 파일 개수, 전체 로드해야 하는 파일 개수를 인자로 전달받을 수 있음.
    // 이 중에서 현재 로드 개수 / 전체 로드 개수 값을 백분율로 계산한 뒤(비트연산자로 소수점 제거), 얘를 프로그래스 바 요소의 width값으로 매번 지정해 줌.(퍼센트는 부모 요소인 .progress의 전체 너비 대비 퍼센트겠지)
    progressBarElem.style.width = `${itemsLoaded / itemsTotal * 100 | 0}%`;
  }

  const models = {
    pig: {
      url: 'https://threejsfundamentals.org/threejs/resources/models/animals/Pig.gltf'
    },
    cow: {
      url: 'https://threejsfundamentals.org/threejs/resources/models/animals/Cow.gltf'
    },
    llama: {
      url: 'https://threejsfundamentals.org/threejs/resources/models/animals/Llama.gltf'
    },
    pug: {
      url: 'https://threejsfundamentals.org/threejs/resources/models/animals/Pug.gltf'
    },
    sheep: {
      url: 'https://threejsfundamentals.org/threejs/resources/models/animals/Sheep.gltf'
    },
    zebra: {
      url: 'https://threejsfundamentals.org/threejs/resources/models/animals/Zebra.gltf'
    },
    horse: {
      url: 'https://threejsfundamentals.org/threejs/resources/models/animals/Horse.gltf'
    },
    knight: {
      url: 'https://threejsfundamentals.org/threejs/resources/models/knight/KnightCharacter.gltf'
    },
  } // 각 gltf 파일들의 url을 저장해놓은 함수. 이후에 gltf JSON 객체, 각 gltf에 정의된 애니메이션 클립들도 여기에 저장해둘거임.

  {
    const gltfLoader = new GLTFLoader(manager);
    for (const model of Object.values(models)) { // Object.values(object)는 전달한 객체 안에 순회 가능한 값들로 배열을 만들어서 리턴해 줌. 따라서 해당 배열 안에 각 gltf에 대한 정보들이 담긴 객체들을 const model에 담아서 처리하려는 것.
      gltfLoader.load(model.url, (gltf) => {
        model.gltf = gltf; // 로드해 온 gltf 객체를 각 model.gltf라는 key를 따로 마련해서 여기다가 넣어둠
      });
    }
  }

  // gltf 모델들의 로딩이 완료되면, 각 gltf에 배열 형태로 저장된 AnimationClip들을 이름 형태로 models의 각 model 객체에 저장해두는 함수
  function prepModelsAndAnimations() {
    Object.values(models).forEach(model => {
      const animsByNames = {}; // '각 클립의 이름: 클립' 형태로 하나의 gltf에 저장된 클립들을 저장해 둘 객체
      model.gltf.animations.forEach((clip) => {
        animsByNames[clip.name] = clip;
      });
      model.animations = animsByNames; // 클립 이름으로 저장된 클립들을 각 model 객체의 animations라는 key에 넣어둠
    });
  }

  // const mixers = []; // 렌더링 루프에서 각 모델들의 AnimationMixer.update 메서드에 직전 프레임에서 현재 프레임까지 흐른 시간값(deltaTime)을 넘겨줄 때 쓰려고 만들어놓음.
  const mixerInfos = []; // 각 모델들의 모든 애니메이션 클립들을 재생시킬 수 있도록 이 배열에다가 값을 저장해서 사용할거임.

  // gltf를 모두 로드 완료하면 호출되는 함수
  function init() {
    // 로딩이 완료되면 프로그래스 바가 담긴 컨테이너 요소를 감춤.
    const loadingElem = document.querySelector('#loading');
    loadingElem.style.display = 'none';

    prepModelsAndAnimations(); // gltf 로딩이 완료되면 각 gltf의 애니메이션 클립들을 이름 형태로 다시 저장해 둠.

    // 로드한 gltf 모델들은 블렌더의 아마추어 개념처럼 '골격'이 존재함. 그래서 이 뼈를 애니메이션으로 움직여줘야 모델들이 움직일 수 있으므로, 전달받은 각 gltf의 root 객체와 하위 객체(골격을 포함)를 모두 복제하여 모든 SkinnedMesh가 각 뼈와 올바르게 연결되도록 함. 
    // Three.js의 SkeletonUtil.clone으로 이 작업을 쉽게 구현할 수 있음.
    Object.values(models).forEach((model, index) => {
      const clonedScene = SkeletonUtils.clone(model.gltf.scene);
      const root = new THREE.Object3D();
      root.add(clonedScene); // 각 골격 요소들에 애니메이션을 주면 모델의 각 요소 위치값에도 영향을 주기 때문에, 얘내들을 일일이 코드로 위치값을 수정해주기 어려우므로, 부모노드에 담아서 한꺼번에 위치를 이동시키려는 것.
      scene.add(root);
      root.position.x = (index - 3) * 3;

      const mixer = new THREE.AnimationMixer(clonedScene); // 전달받은 물체에 대한 애니메이션 플레이어 역할을 함. 여러 개의 AnimationAction들로 이루어져 있음.
      // const firstClip = Object.values(model.animations)[0]; // 각 gltf 애니메이션 클립이 저장된 model.animations에서 첫번쨰 AnimationClip을 가져옴. 참고로 클립이란 '걷기', '숨쉬기', '뛰기' 등과 같은 하나의 애니메이션 동작 루프 단위를 의미함.
      // const action = mixer.clipAction(firstClip); // AnimationMixer.clipAction(AnimationClip)은 전달받은 클립에 대한 AnimationAction을 리턴함. AnimationAction은 해당하는 클립을 재생하거나 다른 애니메이션으로 부드럽게 연결하는 역할을 함.
      // action.play(); // 각 gltf의 첫번째 클립이 할당된 AnimationAction을 재생시킴. 설정을 바꾸지 않는다면 해당하는 첫번째 클립을 반복 재생할거임.
      // mixers.push(mixer); // 렌더링 루프에서 각 gltf의 AnimationMixer에 deltaTime을 넘겨줘야 해서 담아놓는 거  

      // 위에서 각 gltf 모델의 첫 번째 클립만 플레이 해준것과 달리, 모든 클립들을 가져와서 전부 액션으로 만들어 재생할 수 있도록 함.
      const actions = Object.values(model.animations).map((clip) => {
        // 각 model.animations 객체에 저장된 AnimationClip들을 배열로 변환하여 리턴받은 뒤, 각각의 클립 요소들을 map으로 처리하여 AnimationAction으로 리턴받아 그 액션들을 배열로 묶어줘서 리턴해 줌.  
        return mixer.clipAction(clip);
      });
      const mixerInfo = {
        mixer,
        actions,
        actionIndex: -1,
      }; // 각 gltf 모델별로 AnimationMixer, 각 클립별 AnimationActions가 담긴 배열, 현재 AnimationAction의 순서값을 객체로 묶어서 저장해놓음
      mixerInfos.push(mixerInfo); // 렌더링 루프 및 액션을 바꿔주는 이벤트핸들러의 콜백함수에서 사용하기 위해 각 gltf들의 mixerInfo 객체들을 모아놓음.
      playNextAction(mixerInfo); // 최초로 playNextAction을 호출해주면, 각 gltf의 첫번째 클립 액션이 재생될거임. 즉, 페이지를 로드하자 마자 첫번째 클립 액션이 자동으로 재생됨. 이후 클립의 액션은 'keydown' 이벤트를 받아야 재생될거임. 
    });
  }

  // 호출될 때마다 하나의 gltf에 존재하는 액션들 중 현재 액션 순서를 지정하는 actionIndex값을 1씩 증가시킨 뒤, 인덱스에 해당하는 액션을 재생시키는 함수
  function playNextAction(mixerInfo) {
    const {
      actions,
      actionIndex
    } = mixerInfo;
    const nextActionIndex = (actionIndex + 1) % actions.length; // 각 gltf 모델의 actions가 총 몇개인지에 따라 nextActionIndex에 할당되는 값이 달라짐. actionIndex값이 한없이 늘어나더라도, 만약 actions.length가 총 10개면, nextActionIndex에는 나머지값인 0 ~ 9 사이의 값만 순서대로 반복해서 들어감.
    mixerInfo.actionIndex = nextActionIndex; // mixerInfo.actionIndex값을 매번 갱신해줘야 다음에 또 playNextAction을 호출했을때도 불러온 actionIndex값이 이전에 1이 증가된 값으로 갱신돈 값으로 불러와지겠지?
    actions.forEach((action, index) => {
      // nextActionIndex에 할당된 재생시키려는 클립의 액션의 인덱스값과 일치하는 액션만 enabled값을 true로 활성화하고, 나머지 액션들은 모두 false로 속성을 꺼버림.
      // 참고로 AnimationAction.enabled는 작업을 활성화할지 여부를 결정함. 기본값은 true. 이 값이 false면 play()를 호출해도 재생이 안됨.
      const enabled = index === nextActionIndex;
      action.enabled = enabled;
      if (enabled) {
        action.play(); // 위에 const enabled에 넣어준 값이 true인 경우에만 해당 액션을 재생시킴. 어차피 다른 action들은 false로 지정해줘서 play()를 호출해도 재생은 안될거임.
      }
    });
  }

  // 숫자키 1~8번을 누른 뒤, 해당 키의 아스키 10진수 정수값을 이용하여 mixerInfo를 가져오기 위한 인덱스 값을 구하고, playNextAction()함수에 전달 및 호출함으로써, 해당 mixerInfo와 매칭되는 gltf 모델의 AnimationAction을 다음 액션으로 바꿔서 재싱시켜줌.
  window.addEventListener('keydown', (e) => {
    const mixerInfo = mixerInfos[e.keyCode - 49]; // e.keycode에는 현재 누른 키의 아스키 10진수 정수값이 담겨있음. 1 ~ 8까지는 각각 49 ~ 56에 해당함. 근데 MDN에서는 e.keycode 대신 e.code를 사용할 것을 권장하고 있음. 더 이상 웹 표준이 아니라고 함.
    if (!mixerInfo) {
      return; // e.keycode의 아스키코드값으로 계산한 인덱스값으로 참조를 하려니, mixerInfo가 없는 경우가 있음. 즉, 1~8까지만 눌러야 되는데, 9를 눌렀다거나 다른 키를 아무거나 눌렀다거나... 그럴 경우 mixerInfos안에 있는 갯수만큼의 인덱스값을 구할 수 없으므로, 함수를 중단함.
      // 즉, 숫자키 1~8 외에 아무 키나 눌러버리면 함수를 중단하라는 뜻. 
    }
    playNextAction(mixerInfo); // 해당 mixerInfo과 매칭되는 gltf 모델의 AnimationAction을 다음 액션으로 교체해서 재생시킴. 즉, 다음 액션으로 넘어가게 하라는 뜻.
  });

  // resize renderer
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  // rendering loop
  let then = 0;

  function render(now) {
    now *= 0.001; // 밀리초 단위 -> 초 단위로 변환
    const deltaTime = now - then; // 이전 프레임에서 현재 프레임까지 흐른 시간값을 구해놓음. 각 gltf의 믹서에 넘겨줄려고 구하는 것.
    then = now;

    // 렌더러가 리사이징되면 카메라 비율도 그에 맞게 바꿔줌
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    for (const {
        mixer
      } of mixerInfos) {
      mixer.update(deltaTime);
    }

    renderer.render(scene, camera);

    requestAnimationFrame(render); // 내부에서 반복 호출
  }

  requestAnimationFrame(render);
}

main();