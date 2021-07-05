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

import {
  GUI
} from 'https://threejsfundamentals.org/threejs/../3rdparty/dat.gui.module.js';

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
  const far = 1000;
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
    const box = new THREE.Box3();
    const size = new THREE.Vector3(); // 각 모델들의 사이즈를 계산하여 담아놓을 값들.

    Object.values(models).forEach(model => {
      box.setFromObject(model.gltf.scene);
      box.getSize(size);
      model.size = size.length(); // 각 모델의 대각선 방향의 유클리드 길이를 모델 정보 객체에 저장함.
      // console.log('------->:', model.url); // 각 모델별 애니메이션 항목을 구분하려고 출력함
      const animsByNames = {}; // '각 클립의 이름: 클립' 형태로 하나의 gltf에 저장된 클립들을 저장해 둘 객체
      model.gltf.animations.forEach((clip) => {
        animsByNames[clip.name] = clip;
        // console.log('  ', clip.name); // 각 모델별 애니메이션 클립들의 이름을 모두 출력해 줌.
        // 이름이 Walk인 애니메이션 클립에 대해서만 지속시간(duration) 속성값을 절반으로 줄임. 원래 이런 거는 원본 .blend 파일에서 실제 값을 수정해줘야 함.
        if (clip.name === 'Walk') {
          clip.duration /= 2;
        }
      });
      model.animations = animsByNames; // 클립 이름으로 저장된 클립들을 각 model 객체의 animations라는 key에 넣어둠
    });
  }

  // 사용자 입력 시스템을 관리하는 클래스
  class InputManager {
    constructor() {
      this.keys = {}; // 등록된 키들의 상태, 즉, 해당 키가 눌렸는지(.down)와 현재 프레임에서 해당 키가 눌렸는지(.justPressed) 여부를 각각 객체에 묶어서 저장해 두는 객체

      // Map(); 은 key: value 형태로 저장한다는 점에서 객체와 비슷하지만, key의 유형이 문자열 외에도 숫자, boolean 등 다양한 자료형을 허용한다는 차이점이 있음.
      // 왜 이걸 썼냐면, 등록한 키 별로 'keyCode: 키 이름' 이런 형태로 저장하고 싶은데, keyCode에 아스키 10진수 정수값 즉, 숫자를 넣고싶기 때문임.
      const keyMap = new Map();

      const setKey = (keyName, pressed) => { // 전달받은 키와 pressed 값으로 해당 키의 상태값을 수정하는 함수. 근데 왜 굳이 익명함수로 만들어서 할당하는 걸까?
        const keyState = this.keys[keyName]; // 전달받은 키의 상태값(.down, .justPressed)를 가져옴
        keyState.justPressed = pressed && !keyState.down; // 전달받은 pressed가 true고, 키의 이전 상태의 ketState.down이 false여야지만 justPressed에는 true를 다시 지정해 줌.. 참고로 keyState.down은 새로운 pressed를 할당받기 전이니까 눌리기 전까지의 키 상태가 반영되어 있겠지
        keyState.down = pressed; // down에는 말 그대로 키가 눌렸는지 여부만 지정하면 되니까 그냥 전달받은 pressed를 그대로 넣음
      };

      const addKey = (keyCode, name) => { // 전달받은 아스키 코드값과 키 이름으로 this.keys에 상태값을 관리할 키를 등록하는 함수
        this.keys[name] = {
          down: false,
          justPressed: false // 일단 처음에는 상태값을 모두 false로 초기화 함. 
        };
        keyMap.set(keyCode, name); // Map 객체에도 'keyCode: name' 형태로 등록한 키의 데이터를 저장함.
      };

      const setKeyFromKeyCode = (keyCode, pressed) => { // 'keydown' 또는 'keyup' 이벤트 발생 시 호출되서 해당 이벤트의 아스키 코드값과 pressed 여부를 전달받은 뒤, 내부에서 setKey() 함수를 호출해서 현재 눌린 키에 대한 상태값을 다시 지정하는 함수
        const keyName = keyMap.get(keyCode);
        if (!keyName) {
          return; // 현재 이벤트에서 눌린 키의 아스키코드값과 일치하는 숫자값이 keyMap에 없다면, 등록되지 않은 키를 누른 것이므로 함수를 중단함.
        }
        setKey(keyName, pressed); // keyMap에 등록된 키가 존재한다면, 해당 키와 pressed 여부를 전달하면서 setKey를 호출하여 해당 키의 상태값을 바꿔줌.
      };

      addKey(37, 'left');
      addKey(39, 'right');
      addKey(38, 'up');
      addKey(40, 'down');
      addKey(90, 'a');
      addKey(88, 'b'); // this.keys에 총 6개의 키들을 등록함.

      window.addEventListener('keydown', (e) => {
        setKeyFromKeyCode(e.keyCode, true);
      });
      window.addEventListener('keyup', (e) => {
        setKeyFromKeyCode(e.keyCode, false);
      }); // keydown, keyup 이벤트 별로 이벤트핸들러를 등록하여 눌린 키에 대한 상태값을 바꿔주는 setKeyFromKeyCode 콜백함수를 호출하도록 함.

      // #ui 컨테이너로부터 포인터 이벤트를 받아서 왼쪽, 오른쪽 버튼의 영역값을 계산해 구분하기 위해 각 요소들을 불러옴.
      const sides = [{
          elem: document.querySelector('#left'),
          key: 'left'
        },
        {
          elem: document.querySelector('#right'),
          key: 'right'
        },
      ];

      // 호출 시 sides에 할당해놓은 각 key의 이름들을 setKey를 호출하면서 전달함으로써, 등록된 left, right 키의 상태값을 false로 초기화하는 함수
      const clearKeys = () => {
        for (const {
            key
          } of sides) {
          setKey(key, false);
        }
      };

      // #ui 컨테이너로부터 pointerdown 이벤트를 받거나, window에서 pointermove 이벤트를 받으면, 클릭 또는 터치 지점의 좌표값이 오른쪽 버튼 영역인지, 왼쪽 버튼 영역인지 계산한 뒤, 해당하는 방향의 key는 상태값을 true로, 해당하지 않는 방향의 key는 상태값을 false로 설정하는 함수
      const handleMouseMove = (e) => {
        e.preventDefault(); // pointerdown 이벤트는 mousedown, touchdown를 모두 포함하니까, 브라우저에 기본 정의된 touch action이 트리거될 수 있음. 그걸 방지하는 차원에서 쓴 것 같음.
        canvas.focus(); // 이거는 캔버스 요소, 즉 renderer의 domElement 요소에 포커스를 주기 위해서 썼다는데... 왜 포커스를 준건지는 설명이 자세히 안나와있음ㅠ 포커스가 뭔지는 알겠는데 왜 준거지...
        window.addEventListener('pointermove', handleMouseMove);
        window.addEventListener('pointerup', handleMouseUp); // pointerdown해서 해당 콜백함수가 호출되고 나서, window에 pointermove와 pointerup에 대해서도 이벤트핸들러를 등록해줘서, pointerdown된 상태에서만 pointermove 또는 pointerup 이벤트를 받도록 한 것.

        for (const {
            elem,
            key
          } of sides) {
          let pressed = false; // 등록된 left, right key 각각의 상태값을 바꿔주기 위해 전달하는 변수값. 기본값은 false로 지정해놓음
          const rect = elem.getBoundingClientRect(); // 오른쪽 버튼 영역과 왼쪽 버튼 영역 각각의 offset 좌표값들이 담긴 DOMRect 요소를 가져옴.
          const x = e.clientX;
          const y = e.clientY; // 이벤트 좌표값을 가져옴.
          const inRect = x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom; // 이벤트가 오른쪽 버튼 영역 또는 왼쪽 버튼 영역 내에 존재하는지 체크함.
          if (inRect) {
            pressed = true; // 만약 해당 버튼 영역에 존재한다면, 해당 방향의 key 상태값을 true로 바꿔서 전달해주고, 그렇지 않다면 그냥 원래 값인 false를 전달해줄거임.
          }

          setKey(key, pressed); // keyname과 상태값을 전달해서 호출함.
        }
      }

      // window에서 pointerup 이벤트를 받으면 left, right 키의 상태값을 모두 false로 초기화하고, window에 등록된 이벤트핸들러들을 제거해주는 함수
      function handleMouseUp() {
        clearKeys();
        window.removeEventListener('pointermove', handleMouseMove, {
          passive: false
        }); // 여기서는 passive: false를 지정해주는 이유는, handleMouseMove 함수 안에서 e.preventDefault를 호출해주기 때문
        window.removeEventListener('pointerup', handleMouseUp);
      }

      const uiElem = document.querySelector('#ui'); // 이벤트핸들러를 등록하기 위해 #ui 컨테이너를 가져옴
      uiElem.addEventListener('pointerdown', handleMouseMove, {
        passive: false
      }); // #ui 컨테이너를 클릭 및 터치했을때 handleMouseMove를 호출하도록 이벤트핸들러를 등록함. passive: false는 해당 콜백함수 내에서 e.preventDefault를 호출했기 때문

      uiElem.addEventListener('touchstart', (e) => {
        e.preventDefault(); // touchstart는 pointerdown에 합쳐있는 이벤트인데, 얘가 브라우저에서 기본 정의된 액션이 scrolling이라서 이거를 방지하려는 거임.
      }, {
        passive: false
      });
    }

    update() {
      for (const keyState of Object.values(this.keys)) {
        if (keyState.justPressed) {
          // this.keys에 등록된 키들의 상태값을 각각 가져온 뒤, 해당 키의 상태값 중에서 justPressed값이 true로 바뀌어 있다면 매 프레임마다 그거를 false로 초기화 해주도록 함.
          // 근데 참고로 justPressed는 왜 기록하는 걸까? 이 예제에서는 없지만, 점프 동작을 구현할 경우, 점프 버튼을 계속 누르고 있는지 여부와는 상관없이 살짝 눌렀다 떼야 점프가 동작하잖아. 그니까 이런 경우는 계속 누르고 있는지의 여부(.down)을 추척해봤자 소용없지.
          // 그 찰나의 순간에 눌렀는지 여부(.justPressed)를 추적해야 점프동작을 수행해줄 수 있겠지.
          keyState.justPressed = false;
        }
      }
    }
  }

  // 제너레이터 함수를 받아 코루틴을 관리하는 클래스를 만듦.
  function* waitSeconds(duration) { // 제너레이터 함수는 *를 붙여서 생성하며, 내부에서 yield 키워드로 실행 순서를 양보하거나 제너레이터 함수를 일시 중단시킴
    while (duration > 0) {
      duration -= globals.deltaTime;
      yield;
    }
  }

  class CoroutineRunner { // 다른 코루틴 제너레이터 함수들이 업데이트 돠는 동안 제너레이터들이 안전하게 제거, 추가되도록 제거 큐, 추가 큐를 만들어서 SafeArray와 비슷한 구조로 만듦.
    constructor() {
      this.generatorStacks = [];
      this.addQueue = [];
      this.removeQueue = new Set();
    }

    isBusy() {
      return this.addQueue.length + this.generatorStacks.length > 0;
    }

    add(generator, delay = 0) {
      const genStack = [generator];
      if (delay) {
        genStack.push(waitSeconds(delay));
      }
      this.addQueue.push(genStack);
    }

    remove(generator) {
      this.removeQueue.add(generator);
    }

    update() {
      this._addQueued();
      this._removeQueued();
      for (const genStack of this.generatorStacks) {
        const main = genStack[0];
        if (this.removeQueue.has(main)) {
          continue;
        }
        while (genStack.length) {
          const topGen = genStack[genStack.length - 1];
          const {
            value,
            done
          } = topGen.next(); // 해당 제너레이터 함수가 yield 호출에 의해서 멈춘 상태일 때, next() 메서드를 호출해서 코드 실행을 재개함
          if (done) {
            if (genStack.length === 1) {
              this.removeQueue.add(topGen);
              break;
            }
            genStack.pop();
          } else if (value) {
            genStack.push(value);
          } else {
            break;
          }
        }
      }
      this._removeQueued();
    }

    _addQueued() {
      if (this.addQueue.length) {
        this.generatorStacks.splice(this.generatorStacks.length, 0, ...this.addQueue);
        this.addQueue = [];
      }
    }

    _removeQueued() {
      if (this.removeQueue.size) {
        this.generatorStacks = this.generatorStacks.filter(genStack => !this.removeQueue.has(genStack[0]));
        this.removeQueue.clear();
      }
    }
  }

  // 아래부터는 최신 게임을 만들 때 게임의 기본 틀로 사용하는 Entity Component System(ECS)을 만들어준 것.

  // GameObject 인스턴스에서 전달받은 컴포넌트 객체가 gameObject.components 배열의 요소가 맞는지 확인하고, 맞다면 지워주는 함수
  function removeArrayElement(array, element) {
    const index = array.indexOf(element); // 해당 array에서 element를 찾을 수 있는 '첫 번째 인덱스'를 리턴하고, 존재하지 않으면 -1을 리턴함.
    if (index >= 0) {
      // index가 0 이상이라는 뜻은 전달해 준 요소가 해당 array에 존재한다는 뜻. 존재하지 않으면 -1을 리턴할테니까! 그래서 존재하면 해당 배열에서 요소를 제거하라는 거지
      array.splice(index, 1);
    }
  }

  // GameObjectManager 인스턴스에서 생성한 GameObject들을 배열에 추가, 제거하거나 일괄 업데이트할 때 에러없이 안전하게 GameObjects 배열을 관리해주는 클래스
  class SafeArray {
    constructor() {
      this.array = []; // 생성된 GameObject들을 반복문을 돌며 각각 update해줄 때 사용할 배열
      this.addQueue = []; // 반복 중간에 추가된 gameObject를 임시로 보관해놓을 큐
      this.removeQueue = new Set(); // 반복 중간에 제거하려는 gameObject를 임시로 보관해놓을 큐(제거하려는 값들을 임시로 넣어둔 거니까 중복된 값이 필요없겠지. 이 안의 요소들을 제외한 요소들만 filter 해서 this.array를 다시 리턴받으면 되니까.)
    }

    get isEmpty() {
      // 반복 중간에 추가된 큐에 gameObject가 있거나 this.array에 gameObject가 있다면 true, 큐, 배열 모두에 없다면 false를 리턴해줘서 gameObject가 존재하는지 여부를 리턴해 줌
      return this.addQueue.length + this.array.length > 0;
    }

    add(element) {
      this.addQueue.push(element); // 반복 중간에 추가된 gameObject를 큐에 임시로 담아놓음
    }

    remove(element) {
      this.removeQueue.add(element) // 반복 중간에 제거된 gameObject를 큐에 임시로 담아놓음
    }

    // 각각의 gameObject들을 업데이트해주는 함수를 전달해서 gameObject 각각에 실행하는 메서드
    forEach(fn) {
      this._addQueued();
      this._removeQueued(); // 일단 반복 도중에 추가나 제거가 요청되어 큐에 쌓인 gameObject들을 처리해주고, 각 큐를 비워놓음

      for (const element of this.array) {
        if (this.removeQueue.has(element)) {
          continue; // this.array의 각 gameObject에 대하여 반복문을 돌리다가, 현재의 for...of를 돌리는 와중에 제거 큐에 추가된 gameObject에 해당되는게 걸리면 다음 반복문으로 넘어가서 다음 gameObject에 대해서 처리해 줌.
        }
        fn(element); // 제거 큐에 걸리지 않은 gameObject들에 대해서만 업데이트를 실행함.
      }
      this._removeQueued(); // 위의 for...of 반복문 도중에 제거 큐에 쌓인 gameObject들을 제거해주고 제거 큐를 비움. 
    }

    _addQueued() {
      if (this.addQueue.length) {
        // 반복 도중 큐에 추가된 gameObject가 하나 이상 존재한다면, this.array의 끝부분부터 큐에 담겨진 gameObject들을 하나하나 복사해서 추가해 줌.
        this.array.splice(this.array.length, 0, ...this.addQueue);
        this.addQueue = []; // 그리고 큐는 비워줌
      }
    }

    _removeQueued() {
      if (this.removeQueue.size) {
        // 반복 도중 큐에 제거하고자 하는 gameObject가 하나 이상 존재한다면, this.array 요소들 중에서 this.removeQueue에 없는 요소들만 필터링해서 새로운 배열로 덮어씀.
        this.array = this.array.filter(element => !this.removeQueue.has(element));
        this.removeQueue.clear(); // 그리고 큐를 비워줌
      }
    }
  }

  // SafeArray를 이용해서 gameObject들을 관리하는 클래스
  class GameObjectManager {
    constructor() {
      this.gameObjects = new SafeArray(); // gameObject들을 배열에서 추가, 제거하거나 일괄 업데이트 해주는 객체 생성
    }

    createGameObject(parent, name) { // gameObject를 생성한 뒤 추가 큐에 임시로 담아놓는 메서드
      const gameObject = new GameObject(parent, name);
      this.gameObjects.add(gameObject);
      return gameObject; // 생성한 gameObject를 마지막에 리턴해 줌.
    }

    removeGameObject(gameObject) { // 전달받은 gameObject를 제거 큐에 임시로 담아놓는 메서드
      this.gameObjects.remove(gameObject);
    }

    update() { // 각 gameObject들을 업데이트 해주는 함수를 전달해서 생성된 gameObject들을 모두 업데이트시킴.
      this.gameObjects.forEach(gameObject => gameObject.update());
    }
  }

  const kForward = new THREE.Vector3(0, 0, 1); // 각 gltf모델의 부모노드인 transform.translateOnAxis에 전달해줄 z축 방향의 정규화된 좌표값 -> 이렇게 해주면, transform은 지역공간을 기준으로 z축 방향으로만 움직일거임.
  const globals = { // SkinInstance 컴포넌트 객체에서 AnimationMixer.update()에 전달해주기 위해 필요한 deltaTime값을 렌더링 루프에서 계산하려고 전역객체로 생성해놓음.
    camera,
    canvas,
    debug: false, // 기본값은 일단 false로 설정해 놨으니, 초기에는 GUI에도 체크가 해제되어 있을거고, 상태값도 화면에 안보이는 상태임.
    time: 0,
    deltaTime: 0,
    moveSpeed: 16, // 각 gltf 모델의 부모노드인 transform의 이동값과 회전값을 구하는 데 사용할거임.
    player: null,
    congaLine: [],
  };

  const gameObjectManager = new GameObjectManager(); // gameObject들을 관리해주는 클래스 객체 생성
  const inputManager = new InputManager(); // 입력 시스템을 관리해주는 클래스 객체 생성

  class GameObject {
    constructor(parent, name) {
      this.name = name; // gameObject에 임의로 이름을 전달해 할당해놓음. 그냥 나중에 콘솔로 디버깅해서 확인하려고 지정한거임.
      this.components = []; // gameObject안에서 생성한 컴포넌트들을 담아놓을 배열
      this.transform = new THREE.Object3D(); // 각 gltf 모델을 자식노드로 추가해서 모델 하나의 각 요소들을 한꺼번에 이동시키기 위해 만든 부모 노드
      parent.add(this.transform); // parent는 말그대로 최상위 부모노드, 즉 씬이 전달될거임.
    }

    addComponent(ComponentType, ...args) { // 전달받은 컴포넌트 클래스로 새로운 컴포넌트 객체를 생성해서 gameObject.components에 추가해주는 메서드
      const component = new ComponentType(this, ...args); // gameObject.components 배열에 넘겨줄 수 있음과 동시에, 생성하려는 컴포넌트 자체에 해당 gameObject를 넘겨주는 게 더 편하다고 함.
      this.components.push(component);
      return component; // 생성된 컴포넌트 객체를 마지막에 리턴해 줌.
    }

    removeComponent(component) {
      // 전달받은 컴포넌트 객체 요소가 해당 gameObject.components의 배열 요소가 맞는지 확인한 뒤, 맞다면 지워주는 함수를 호출함.
      removeArrayElement(this.components, component);
    }

    getComponent(ComponentType) { // 컴포넌트 클래스를 전달받은 뒤, 해당 클래스로 만든 컴포넌트 객체가 gameObject.components에 있는지 찾아서 리턴해주는 함수
      return this.components.find(c => c instanceof ComponentType); // find는 항상 배열에서 주어진 판별함수를 만족하는 '첫 번째 요소만' 리턴해 줌. 따라서 this.components에는 같은 클래스로 만든 컴포넌트 객체들을 중복해서 사용할 수 없음.
    }

    update() {
      for (const component of this.components) {
        component.update(); // gameObject안에 담긴 컴포넌트 객체들을 반복문을 돌면서 전부 업데이트 해줌.
      }
    }
  }

  // 모든 컴포넌트의 기초가 되는 기초 컴포넌트 클래스를 만들어놓음
  class Component {
    constructor(gameObject) {
      // 기초 컴포넌트는 앞으로 만들 모든 컴포넌트들에게 상속되므로, 각 컴포넌트들의 생성자에는 기초 컴포넌트에서 만들어진 gameObject를 첫번째 인자로 갖게 될거임.
      // 이렇게 함으로써 각 컴포넌트 객체의 부모 gameObject에 쉽게 접근할 수 있고, 다른 컴포넌트들을 쉽게 찾을 수 있어서 좋음. 
      this.gameObject = gameObject;
    }

    update() {

    }
  }

  // 카메라를 전달받아서 해당 카메라의 projectionMatrix를 이용해서 해당 카메라와 동일한 절두체를 생성하는 클래스
  // 이걸 왜 만드냐고? 사람모델이 계속 달리다가 이 절두체 영역을 벗어나면 다시 원점으로 돌려놓으려고.
  class CameraInfo extends Component {
    constructor(gameObject) {
      super(gameObject); // this.gameObject를 상속받겠지
      this.projScreenMatrix = new THREE.Matrix4(); // 새로운 4*4 행렬을 생성해놓음. 여기에 전달받은 카메라의 projectionMatrix를 구해줄거임.
      this.frustum = new THREE.Frustum(); // 새로운 절두체를 생성함.
    }

    update() {
      const {
        camera
      } = globals; // 전역 객체에 저장해 둔 카메라를 가져옴
      this.projScreenMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      ); // 카메라의 projectionMatrix에 카메라의 matrixWorldInverse를 곱해줘서 4*4 행렬에 할당해놓음
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix); // 이 메서드는 전달받은 projectionMatrix로 절두체의 6면을 지정해 줌. 즉, 카메라의 projectionMatrix로 절두체 6면을 지정했으므로, 해당 카메라의 절두체와 동일한 절두체가 되겠지.
    }
  }

  // 로드된 gltf 객체를 관리하는 컴포넌트 클래스. 처음에는 init 함수에서 작성해줬던 코드를 여기로 옮겨줌. 애니메이션이 있는 모델을 복사해온 뒤, 모델의 애니메이션 중에서 전달받은 이름에 해당하는 애니메이션의 클립만 애니메이션 액션을 생성해서 재생시켜줄거임.
  class SkinInstance extends Component {
    constructor(gameObject, model) {
      super(gameObject); // 부모 클래스인 기초 컴포넌트 클래스를 전달받은 gameObject를 다시 전달해주면서 생성함. -> 첫번째 인자로 this.gameObject를 갖게될거임.
      this.model = model; // models 객체에 있던 각 gltf 모델 정보들이 담긴 객체를 통째로 전달받은거임.
      this.animRoot = SkeletonUtils.clone(this.model.gltf.scene); // 전달받은 정보 객체 중 로드된 gltf 모델이 담긴 gltf로 접근해서, 그 gltf 모델의 루트요소(scene)에서부터 하위 요소(골격 포함)을 모두 복사하여 SkinnedMesh와 각 뼈를 올바르게 연결시켜 줌.
      this.mixer = new THREE.AnimationMixer(this.animRoot); // 전달받은 gltf 모델의 애니메이션 플레이어 역할을 할 믹서를 생성함.
      gameObject.transform.add(this.animRoot); // gltf 모델의 각 요소를 한꺼번에 움직이기 위해 부모 gameObject의 부모노드인 transform에 추가함.
      this.actions = {}; // 생성한 애니메이션 액션을 저장해 둘 객체
    }

    setAnimation(animName) { // 전달받은 애니메이션 이름에 해당하는 클립을 찾은 뒤, 해당 클립에 해당하는 액션이 이미 믹서에 생성되어 있으면 그거를 가져오고, 없으면 새로 생성함. 그리고 나서 그 액션을 재생시킴.
      const clip = this.model.animations[animName]; // 전달받은 이름에 해당하는 클립을 가져옴

      for (const action of Object.values(this.actions)) {
        action.enabled = false; // 일단 this.actions에 생성하여 담아놓은 모든 액션들을 비활성화함.
      }

      const action = this.mixer.clipAction(clip); // 해당 클립에 해당하는 액션이 이미 있다면 가져오고, 없다면 액션을 생성함.
      action.enabled = true; // 해당 액션을 활성화해주고
      action.reset(); // 해당 액션의 paused 를 false로, enabled 를 true로, time 을 0으로 설정함. 액션을 처음부터 재생시키기 위해 필요한 값들을 초기화한다고 보면 됨. 만약 해당 액션이 이미 재생되서 작업이 완료된 거라면, reset으로 초기화해줘야 다시 재생이 가능함.
      action.play();
      this.actions[animName] = action; // 생성한 액션을 this.actions 객체의 animName이라는 key에 할당해 줌.
    }

    update() {
      this.mixer.update(globals.deltaTime); // 렌더링 루프 함수에서 해줬던 것처럼, 이전 프레임과 현재 프레임 사이의 시간값(deltaTime)을 해당 mixer.update()에 전달하면서 업데이트 해주도록 함. 
      // -> 나중에 렌더링 루프에서 GameObjectManager.update()를 호출해서 일괄적으로 실행할거림.
    }
  }

  // 각 동물들의 Animal 컴포넌트 객체 내에서 기차놀이에 필요한 상태 객체들을 받아서 관리해주는 유한 상태 기계 헬퍼 클래스
  class FiniteStateMachine {
    constructor(states, initialState) {
      this.states = states;
      this.transition(initialState);
    }

    get state() {
      return this.currentState;
    }

    transition(state) {
      const oldState = this.states[this.currentState];
      if (oldState && oldState.exit) {
        oldState.exit.call(this);
      }
      this.currentState = state;
      const newState = this.states[state];
      if (newState.enter) {
        newState.enter.call(this);
      }
    }

    update() {
      const state = this.states[this.currentState];
      if (state.update) {
        state.update.call(this);
      }
    }
  }

  const gui = new GUI(); // dat.GUI로 체크박스 입력값을 받아 상태값을 나타내는 HTML 요소를 보여줄 지 말지를 결정함.
  gui.add(globals, 'debug').onChange(showHideDebugInfo);
  gui.close(); // 처음에는 GUI창을 닫아놓음

  // 각 모델들의 상태 요소들을 집어넣을 컨테이너를 가져옴
  const labelContainerElem = document.querySelector('#labels');

  function showHideDebugInfo() {
    labelContainerElem.style.display = globals.debug ? '' : 'none';
  } // 전역객체의 debug값이 dat.GUI 체크박스로부터 true/false를 입력받으면, 그거에 따라 display값을 꺼주거나 켜주거나 할거임
  showHideDebugInfo(); // debug값의 기본값(false)를 기준으로 display값을 한 번 지정해줘야 화면에서 안보이게 되겠지.

  // 각 모델들의 상태를 #labels에 넣어서 보여줄 헬퍼 클래스 컴포넌트
  class StateDisplayHelper extends Component {
    constructor(gameObject, size) {
      super(gameObject);
      this.elem = document.createElement('div');
      labelContainerElem.appendChild(this.elem);
      this.pos = new THREE.Vector3(); // 상태 요소를 만들어 #labels에 추가함

      this.helper = new THREE.PolarGridHelper(size / 2, 1, 1, 16) // PolarGird, 즉 물체의 바닥 끝 지점에 동그란 원형 그리드를 그려주는 메서드
      gameObject.transform.add(this.helper);
    }

    setState(s) {
      this.elem.textContent = s; // 상태값을 전달받아 상태 요소에 텍스트로 추가해 줌.
    }

    setColor(cssColor) {
      this.elem.style.color = cssColor;
      this.helper.material.color.set(cssColor); // 전달받은 컬러값을 elem, PolarGridHelper에 전달해 줌.
    }

    update() {
      this.helper.visible = globals.debug;
      if (!globals.debug) {
        return; // 만약 debug 값이 false면 update 메서드를 여기서 종료함
      }
      const {
        pos
      } = this;
      const {
        transform
      } = this.gameObject;
      const {
        canvas
      } = globals;
      pos.copy(transform.position);

      // 모델의 위치값을 가져온 뒤, 해당 위치값을 정규화함.
      pos.project(globals.camera);

      // 정규화한 위치값을 css 위치값으로 변환
      const x = (pos.x * 0.5 + 0.5) * canvas.clientWidth;
      const y = (pos.y * -0.5 + 0.5) * canvas.clientHeight;

      // HTML 상태 요소를 해당 CSS 위치값(정확히는, 캔버스 내의 좌표값)으로 옮김
      this.elem.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    }
  }

  // 로드된 gltf 모델들 중 '사람 모델(knight)'을 전달해서 SkinInstance 컴포넌트 객체를 생성한 뒤, 사람 모델의 특정 애니메이션 이름을 넘겨서 액션을 재생하도록 하는 컴포넌트 클래스 
  class Player extends Component {
    constructor(gameObject) {
      super(gameObject); // 기초 컴포넌트 클래스로부터 상속받은 this.gameObject가 첫번째 인자로 생성됨.
      const model = models.knight; // 사람모델에 관한 정보들이 담긴 객체를 일단 통째로 할당받음
      globals.playerRadius = model.size / 2; // 플레이어의 반지름을 boundingBox의 유클리드 길이의 절반으로 지정함.
      this.text = gameObject.addComponent(StateDisplayHelper, model.size); // 플레이어도 상태 및 y축 각도 방향을 html 요소로 보여줄 헬퍼 컴포넌트 객체를 생성
      this.skinInstance = gameObject.addComponent(SkinInstance, model); // 해당 gameObject를 넘겨주면서 SkinInstance 컴포넌트 객체를 생성함과 동시에, 해당 gameObject.components 배열에도 생성된 컴포넌트 객체가 추가됨.
      this.skinInstance.setAnimation('Run'); // 'Run'이라는 애니메이션 이름을 전달해줘서 해당 애니메이션 클립의 액션을 만든 뒤 재생시켜 줌. 애니메이션 이름은 prepModelsAndAnimations() 함수의 반복문에서 콘솔 출력으로 확인할 수 있음.
      this.turnSpeed = globals.moveSpeed / 4; // 사람모델이 키 입력을 받아 회전할 때의 회전값을 구하기 위해 필요한 값.
      this.offscreenTimer = 0; // 사람모델이 절두체를 벗어난 후 지난 시간을 카운트하는 값
      this.maxTimeOffScreen = 3; // 사람모델이 절두체를 벗어난 후 지날 수 있는 최대 시간값. 이 시간을 지나서까지 절두체에 벗어나 있으면 원점으로 되돌릴거임.

      this.runner = new CoroutineRunner(); // 코루틴 생성

      function* emitNotes() {
        for (;;) {
          yield waitSeconds(random(0.5, 1)); // 0.5 ~ 1초 사이마다 한 번씩 음표를 뱉도록 함.
          const noteGO = gameObjectManager.createGameObject(scene, 'note');
          noteGO.transform.position.copy(gameObject.transform.position);
          noteGO.transform.position.y += 5;
          noteGO.addComponent(Note);
        }
      }

      this.runner.add(emitNotes()); // 해당 제너레이터 함수를 코루틴에 추가해 줌. -> 이 함수는 0.5 ~ 1초 사이마다 계속 Note 컴포넌트 객체를 생성함. 
    }

    update() {
      this.runner.update();

      const {
        deltaTime,
        moveSpeed,
        cameraInfo
      } = globals; // 전역 객체로부터 시간값, 속도값, 을 가져옴
      const {
        transform
      } = this.gameObject; // 생성자에서 SkinInstance 컴포넌트 객체를 생성했기 때문에, 이 컴포넌트의 gameObject 안에는 사람모델 요소들을 담아놓은 부모노드인 transform이 존재함. 이걸 gameObject에서 가져온 것.
      const delta = (inputManager.keys.left.down ? 1 : 0) + (inputManager.keys.right.down ? -1 : 0); // 현재 왼쪽 방향키가 눌렸으면 1, 오른쪽 방향키가 눌렸으면 -1, 둘다 눌렸거나 둘다 안눌렸다면 0을 지정함. 
      transform.rotation.y += this.turnSpeed * delta * deltaTime; // 왼쪽 방향키를 누르면 양수값이 더해지니 반시계 방향으로 회전, 오른쪽 방향키를 누르면 음수값이 더해지니 시계 방향으로 회전함.
      // 참고로, 좌표계 상에서 양의 X축을 기준으로, 각도가 양수이면 반시계 방향으로 각도가 커지고, 음수면 시계방향으로 각도가 커짐. 방향 헷갈리지 말 것.
      transform.translateOnAxis(kForward, moveSpeed * deltaTime); // Object3D.translateOnAxis(normalized Vector3, distance)는 정규화된 벡터값 방향으로 (여기서는 (0, 0, 1)이니까 z축 방향이겠지?) distance값만큼 해당 Object3D의 '지역공간을 기준으로' 이동시키는 메서드임.

      // 근데 지금 보면 rotation은 delta가 0이면 더이상 회전을 안하지만, translateOnAxis은 매 프레임마다 update가 호출될 때마다 transform을 z축 방향으로 움직이게 할거임 
      // -> 즉, 끝없이 움직인다는 뜻. 그러다가 언젠가 카메라 절두체 밖으로 벗어나면, 얘를 다시 원점으로 돌려놓을 장치가 필요함. 그래서 cameraInfo 컴포넌트 객체의 update가 먼저 호출되도록 해서 절두체를 미리 구해놓는거임.
      const {
        frustum
      } = cameraInfo;
      if (frustum.containsPoint(transform.position)) { // Frustum.containsPoint(Vector3) 메서드는 전달한 Vector3 좌표값이 해당 절두체 영역 내에 위치하는지 여부를 판단함.
        this.offscreenTimer = 0; // 만약 사람모델이 절두체 영역 안에 있다면 offscreenTimer를 0으로 초기화함. 왜냐? 저 값은 절두체를 벗어났을때의 시간만 카운트해줘야 하니까
      } else {
        this.offscreenTimer += deltaTime; // 만약 절두체를 벗어났다면 카운팅을 시작함

        if (this.offscreenTimer >= this.maxTimeOffScreen) {
          transform.position.set(0, 0, 0); // 그러다가 절두체를 벗어난 시간이 3초를 넘었다면 사람모델의 위치를 원점으로 되돌림.
        }
      }
    }
  }

  // 전달받은 값 사이에 있는 랜덤값을 리턴해주는 함수 -> 정확히는 emitNotes 제너레이터 함수가 Note 컴포넌트 객체를 생성하는 랜덤한 시간 간격을 구해서 리턴해 줌.
  function random(min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    return Math.random() * (max - min) + min;
  }

  // Note 컴포넌트를 만들기 위해 필요한, 캔버스 텍스처를 이용해서 음표 텍스트가 렌더링 된 noteTexture를 생성하는 함수를 정의 및 호출함.
  function makeTextTexture(str) {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.width = 64;
    ctx.canvas.height = 64;
    ctx.font = '60px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFF';
    ctx.fillText(str, ctx.canvas.width / 2, ctx.canvas.height / 2);

    return new THREE.CanvasTexture(ctx.canvas);
  }
  const noteTexture = makeTextTexture('♪'); // 여기서 만든 캔버스 텍스처의 음표는 흰색으로 렌더되며, Note 컴포넌트 객체에서 색을 따로 지정해 원하는 색의 음표를 구해줄거임.

  // Note 컴포넌트 클래스를 만듦. 음표 컴포넌트는 SpriteMaterial과 Sprite를 사용하도록 함. -> 카메라가 어느 각도에서 보던지 카메라를 향하도록 함
  class Note extends Component {
    constructor(gameObject) {
      super(gameObject);
      const {
        transform
      } = gameObject;
      const noteMaterial = new THREE.SpriteMaterial({
        color: new THREE.Color().setHSL(random(1), 1, 0.5), // hue값이 0 ~ 1 사이의 랜덤값으로 지정된 랜덤한 컬러값으로 할당할거임. -> 음표의 색상도 랜덤하게 나오겠군
        map: noteTexture, // 위에서 만든 캔버스 텍스처를 지정해주고
        side: THREE.DoubleSide,
        transparent: true,
      });
      const note = new THREE.Sprite(noteMaterial);
      note.scale.setScalar(3); // 크기를 x, y, z 각각에 3배씩 곱해줌
      transform.add(note);
      this.runner = new CoroutineRunner();
      const direction = new THREE.Vector3(random(-0.2, 0.2), 1, random(-0.2, 0.2));

      // Sprite이 생성된 이후 60프레임 동안 무작위 속도로 이동함. 동시에 Sprite의 opacity도 줄여주면서 페이드아웃 효과를 줌. 
      // 반복문이 끝나고 제너레이터 함수의 코드 실행이 재개되면 음표와 음표의 gameObject를 제거함
      function* moveAndRemove() {
        for (let i = 0; i < 60; i++) {
          transform.translateOnAxis(direction, globals.deltaTime * 10);
          noteMaterial.opacity = 1 - (i / 60);
          yield;
        }
        transform.parent.remove(transform);
        gameObjectManager.removeGameObject(gameObject);
      }

      this.runner.add(moveAndRemove());
    }

    update() {
      this.runner.update();
    }
  }

  // 매개변수 obj1과 obj2가 가깝다면 true를 리턴해주는 함수
  function isClose(obj1, obj1Radius, obj2, obj2Radius) {
    const minDist = obj1Radius + obj2Radius;
    const dist = obj1.position.distanceTo(obj2.position); // 두 벡터 사이의 거리를 구함.
    return dist < minDist;
  }

  // 전달받은 v값이 -min과 +min 사이에 존재하는 값이 되도록 변환해서 리턴해 줌.
  function minMagnitude(v, min) {
    return Math.abs(v) > min ? min * Math.sign(v) : v; // Math.sign()은 전달한 값의 부호(즉, 1, -1, 0, -0, NaN 중 하나)를 리턴함.
  }

  // 즉시실행함수를 호출해서 내부 중첩함수를 리턴하여 할당함.
  const aimTowardAndGetDistance = function () {
    const delta = new THREE.Vector3();

    return function aimTowardAndGetDistance(source, targetPos, maxTurn) {
      delta.subVectors(targetPos, source.position); // 목표 좌표값과 source의 위치값을 빼줌
      const targetRot = Math.atan2(delta.x, delta.z) + Math.PI * 1.5; // 바라볼 방향 각도(?) 를 계산함
      const deltaRot = (targetRot - source.rotation.y + Math.PI * 1.5) % (Math.PI * 2) - Math.PI; // 더 가까운 방향으로 회전함.
      const deltaRotation = minMagnitude(deltaRot, maxTurn); // maxTurn보다 절댓값이 커지지는 않도록 함. -> maxTurn보다 빠른 속도로는 돌지 않도록 함.
      source.rotation.y = THREE.MathUtils.euclideanModulo(
        source.rotation.y + deltaRotation, Math.PI * 2
      ); // rotation값을 0에서 Math.PI * 2 즉, 360도 사이로 유지함.
      return delta.length(); // 목표까지의 거리값을 계산하여 리턴함.
    };
  }();

  // Player 컴포넌트 클래스와 비슷한 방법으로 Animal 컴포넌트 클래스를 만듦.
  class Animal extends Component {
    constructor(gameObject, model) { // Player 컴포넌트 클래스와 달리 처음부터 각 동물모델들을 전달받으면서 생성함.
      super(gameObject); // this.gameObject를 상속받겠지
      this.helper = gameObject.addComponent(StateDisplayHelper, model.size); // 각 모델의 상태값을 html 요소로 보여주는 헬퍼 컴포넌트 객체 생성
      const hitRadius = model.size / 2;
      const skinInstance = gameObject.addComponent(SkinInstance, model);
      skinInstance.mixer.timeScale = globals.moveSpeed / 4; // 해당 동물모델의 AnimationMixer.timeScale 값을 전역객체의 이동속도의 1/4배로 설정함으로써, 이동속도에 따라 애니메이션 속도도 비례하게 계산되도록 설정함.
      const transform = gameObject.transform;
      const playerTransform = globals.player.gameObject.transform;
      const maxTurnSpeed = Math.PI * (globals.moveSpeed / 4);
      const targetHistory = [];
      let targetNdx = 0;

      function addHistory() {
        const targetGO = globals.congaLine[targetNdx];
        const newTargetPos = new THREE.Vector3();
        newTargetPos.copy(targetGO.transform.position);
        targetHistory.push(newTargetPos);
      }

      this.fsm = new FiniteStateMachine({
        idle: {
          enter: () => {
            skinInstance.setAnimation('Idle');
          },
          update: () => {
            // 플레이어가 해당 동물 모델 근처에 있는지 확인하고, 가까이 있다면 다음 상태로 전환시켜 줌.
            if (isClose(transform, hitRadius, playerTransform, globals.playerRadius)) {
              this.fsm.transition('waitForEnd');
            }
          },
        },
        waitForEnd: {
          enter: () => {
            skinInstance.setAnimation('Jump');
          },
          update: () => {
            // 기차의 가장 끝에 존재하는 gameObject를 가져옴
            const lastGO = globals.congaLine[globals.congaLine.length - 1];
            const deltaTurnSpeed = maxTurnSpeed * globals.deltaTime;
            const targetPos = lastGO.transform.position;
            aimTowardAndGetDistance(transform, targetPos, deltaTurnSpeed);
            // 기차의 마지막 요소가 player와 가까이 있는지 확인하고, 가까이 있으면 해등 동물 상태를 goToLast 로 바꿔줌.
            if (isClose(transform, hitRadius, lastGO.transform, globals.playerRadius)) {
              this.fsm.transition('goToLast');
            }
          }
        },
        goToLast: {
          enter: () => {
            // 따라갈 대상을 기록함.
            targetNdx = globals.congaLine.length - 1;
            // 기차 마지막에 스스로를 추가함.
            globals.congaLine.push(gameObject);
            skinInstance.setAnimation('Walk');
          },
          update: () => {
            addHistory();

            // 기록된 위치 중 가장 나중 위치로 이동함.
            const targetPos = targetHistory[0]; // 0번 인덱스에 저장하는 기록이 가장 나중 위치인가 봄.
            const maxVeloxity = globals.moveSpeed * globals.deltaTime;
            const deltaTurnSpeed = maxTurnSpeed * globals.deltaTime;
            const distance = aimTowardAndGetDistance(transform, targetPos, deltaTurnSpeed);
            const velocity = distance;
            transform.translateOnAxis(kForward, Math.min(velocity, maxVeloxity));
            if (distance <= maxVeloxity) {
              this.fsm.transition('follow');
            }
          }
        },
        follow: {
          update: () => {
            addHistory();

            // 가장 오래된 위치값을 지우고 자기 자신의 위치값으로 사용함.
            const targetPos = targetHistory.shift();
            transform.position.copy(targetPos);
            const deltaTurnSpeed = maxTurnSpeed * globals.deltaTime;
            aimTowardAndGetDistance(transform, targetHistory[0], deltaTurnSpeed);
          },
        }
      }, 'idle');
    }

    update() { // 업데이트된 동물 상태를 호출해주는 메서드
      this.fsm.update();
      const dir = THREE.MathUtils.radToDeg(this.gameObject.transform.rotation.y); // 동물 객체의 y방향의 각도를 degree 단의로 리턴받음
      this.helper.setState(`${this.fsm.state}:${dir.toFixed(0)}`); // 현재 동물 상태: 동물의 y축 각도(즉 방향각도겠지)를 텍스트로 렌더해 줌.
    }
  }

  // gltf를 모두 로드 완료하면 호출되는 함수
  function init() {
    // 로딩이 완료되면 프로그래스 바가 담긴 컨테이너 요소를 감춤.
    const loadingElem = document.querySelector('#loading');
    loadingElem.style.display = 'none';

    prepModelsAndAnimations(); // gltf 로딩이 완료되면 각 gltf의 애니메이션 클립들을 이름 형태로 다시 저장해 둠.

    // 카메라 관련 gameObject를 생성하여 거기에 CameraInfo 컴포넌트 객체를 생성 및 추가함.
    // 다만, player 컴포넌트 객체의 update 메서드에서 frustum을 가지고 사람모델이 카메라 절두체 영역을 벗어났는지 판단하기 때문에, player 컴포넌트 객체보다 먼저 cameraInfo 컴포넌트 객체를 생성해줘야
    // gameObjectManager가 먼저 생성된 카메라 gameObject의 cameraInfo 컴포넌트 객체의 update 메서드를 먼저 호출해주겠지. 그래야 절두체 사이즈를 먼저 구해놓을 수 있으니까.
    {
      const gameObject = gameObjectManager.createGameObject(camera, 'camera');
      globals.cameraInfo = gameObject.addComponent(CameraInfo); // 전역 객체에 cameraInfo라는 key를 생성한 뒤, 거기에 생성한 CameraInfo 컴포넌트 객체를 할당해 줌.
    }

    {
      const gameObject = gameObjectManager.createGameObject(scene, 'player'); // 'player'라는 임의의 name값을 할당해서 새로운 gameObject를 생성함. 물론 이때 gameObjectManager를 통하여 생성해야 함. gameObject를 통합적으로 관리해주는 객체니까.
      globals.player = gameObject.addComponent(Player); // 'Player'라는 이름의 gameObject에 해당 gameObject를 넘겨주면서 Player 컴포넌트 객체를 생성 및 추가해 줌.
      // 이렇게 함으로써 사람모델로 SkinInstance 컴포넌트 객체도 알아서 생성될거고, 사람모델의 'Run'이라는 이름의 애니메이션을 알아서 재생시켜 줄거임. 
      // 즉, init() 함수에서 처음에 작성해줬던 각 모델의 애니메이션 클립에서 액션을 구한 다음에 액션을 재생하는 코드들을 GameObjectManager 객체, 즉 Entity Component System(ECS)을 이용해서 실행해 주는거임.
      globals.congaLine = [gameObject];
      // 플레이어를 전역객체에 추가해서 다른 동물 컴포넌트들이 플레이어의 위치를 추적하도록 하고, 기차의 머리를 플레이어의 gameObject로 지정함. 
    }

    const animalModelNames = [
      'pig',
      'cow',
      'llama',
      'pug',
      'sheep',
      'zebra',
      'horse',
    ];
    const base = new THREE.Object3D();
    const offset = new THREE.Object3D();
    base.add(offset);

    // 소용돌이 형태로 동물들을 배치함.
    const numAnimals = 28;
    const arc = 10;
    const b = 10 / (2 * Math.PI);
    let r = 10;
    let phi = r / b;
    for (let i = 0; i < numAnimals; i++) {
      const name = animalModelNames[random(animalModelNames.length) | 0];
      const gameObject = gameObjectManager.createGameObject(scene, name);
      gameObject.addComponent(Animal, models[name]);
      base.rotation.y = phi;
      offset.position.x = r;
      offset.updateWorldMatrix(true, false);
      offset.getWorldPosition(gameObject.transform.position); // offset에 계산된 전역공간 좌표값을 각 동물 모델 부모노드인 transform의 position에 복사해 줌.
      phi += arc / r;
      r = b * phi;
    }
  }

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
    globals.time = now * 0.001; // 밀리초 단위 -> 초 단위로 변환
    globals.deltaTime = Math.min(globals.time - then, 1 / 20); // 이전 프레임에서 현재 프레임까지 흐른 시간값을 구해놓음. 이때 시간값이 1/20초를 넘지 않도록 설정해 줌.
    // 왜 이렇게 했냐면 사용자가 탭을 몇 초 동안 숨겼다가 다시 열면 프레임 사이의 시간값 간격이 너무 커져서 캐릭터가 순간이동하는 것처럼 보이는 버그가 발생함... 그래서 암만 프레임 간격이 길더라도 전달해주는 deltaTime 1/20초를 넘기지 않도록 한 것. 
    then = globals.time;

    // 렌더러가 리사이징되면 카메라 비율도 그에 맞게 바꿔줌
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    gameObjectManager.update(); // gameObjectManager 객체의 update 메서드를 호출해주면 해당 객체에 의해 관리되는 gameObject들과 그것들의 component들이 일괄적으로 업데이트 됨.
    inputManager.update(); // gameObjectManager.update(); 앞에서 호출하면, gameObjectManager.update()에 의해 호출되는 Player 컴포넌트 객체의 update()에는 jusrPressed가 항상 false로 전달되는 문제가 있음. 물론 이 예제에서는 justPressed를 사용하는 동작(점프 등)을 구현하지는 않지만... 

    renderer.render(scene, camera);

    requestAnimationFrame(render); // 내부에서 반복 호출
  }

  requestAnimationFrame(render);
}

main();