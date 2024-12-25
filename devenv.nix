{
  inputs,
  fenix,
  pkgs,
  config,
  lib,
  ...
}: let
  ff = fenix.packages.${pkgs.stdenv.system};
  toolchain = ff.fromToolchainFile {
    file = ./rust-toolchain.toml;
    sha256 = "sha256-9Uph9tM+K51ibOcz8cqvQ9ezgarqZ228Rqv4LxoRgtU=";
  };
in {
  name = "agora";
  devcontainer.enable = true;
  difftastic.enable = true;
  dotenv.enable = true;

  languages = {
    go.enable = true;

    nix.enable = true;

    cplusplus.enable = true;

    rust = {
      enable = true;
      # https://devenv.sh/reference/options/#languagesrustchannel
      channel = "nightly";
      toolchain = toolchain;
    };

    solidity = {
      enable = true;
      foundry.enable = true;
    };

    # javascript = {
    #   corepack.enable = true;
    #   enable = true;
    #   package = pkgs.nodejs;
    # };
    typescript.enable = true;
  };

  env.LIBCLANG_PATH = lib.makeLibraryPath [pkgs.llvmPackages_latest.libclang.lib];

  # https://devenv.sh/packages/
  packages = with pkgs; [
    git
    curl
    openssl
    rust-analyzer
    ninja
    protobuf

    inferno

    # Solidity related
    slither-analyzer
    # Unfortunately nixpkgs.solidity only has 0.8.21, so we need to use solc-select
    solc-select
    bulloak
    eslint_d
    nodePackages.typescript-language-server

    # bun without bugs, needed for foundry
    (inputs.nixpkgs-working-bun.legacyPackages.${system}.bun)
  ];

  enterShell = ''
    echo 🦾 Helper scripts:
    echo 🦾
    ${pkgs.gnused}/bin/sed -e 's| |••|g' -e 's|=| |' <<EOF | ${pkgs.util-linuxMinimal}/bin/column -t | ${pkgs.gnused}/bin/sed -e 's|^|🦾 |' -e 's|••| |g'
    ${lib.generators.toKeyValue {} (lib.mapAttrs (name: value: value.description) config.scripts)}
    EOF
  '';

  # https://devenv.sh/tests/
  # devenv test
  enterTest = ''
    evm-lint
    evm-build
    evm-test
  '';

  # https://devenv.sh/pre-commit-hooks/
  pre-commit.hooks = {
    prettier.enable = true;
    detect-aws-credentials.enable = true;
    detect-private-keys.enable = true;
    check-added-large-files.enable = true;
    ripsecrets.enable = true;

    # GH Actions
    # actionlint.enable = true;

    # execute example shell from Markdown files
    # mdsh.enable = true;

    # Markdown
    # Check for broken links in mkdown
    # lychee.enable = true;
    # markdownlint.enable = true;

    # Nix
    alejandra.enable = true;
    flake-checker.enable = true;

    # Files
    shellcheck.enable = true;
    check-json.enable = true;
    check-toml.enable = true;
    check-yaml.enable = true;
    taplo.enable = true;

    # We do this because risc0 toolchain doesn't have clippy
    # note: the `riscv32im-risc0-zkvm-elf` target may not be installed
    # clippy.enable = true;
    # clippy.stages = [
    #   "manual"
    #   "post-commit"
    # ];
    rustfmt.enable = true;
    cargo-check.enable = true;

    evm-build = {
      enable = false;
      name = "Build EVM Contracts";
      entry = "sh -c 'cd contracts/evm && bun run build'";
      pass_filenames = false;
      language = "system";
      stages = ["pre-push"];
    };

    evm-lint = {
      enable = false;
      name = "Lint EVM Contracts";
      entry = "evm-lint";
      files = "contracts/evm/.*\\.(sol|json|md|yml)$";
      types = ["file"];
      language = "system";
    };

    evm-lint-fix = {
      enable = false;
      name = "Format EVM Contracts";
      entry = "evm-lint-fix";
      files = "contracts/evm/.*\\.(sol|json|md|yml)$";
      types = ["file"];
      language = "system";
    };

    evm-test = {
      enable = false;
      name = "Test EVM Contracts";
      entry = "sh -c 'cd contracts/evm && bun run test'";
      pass_filenames = false;
      language = "system";
      stages = ["pre-push"];
    };

    evm-test-coverage = {
      enable = false;
      name = "Test EVM Contract Coverage";
      entry = "sh -c 'cd contracts/evm && bun run test:coverage'";
      pass_filenames = false;
      language = "system";
    };

    prettier-check = {
      enable = true;
      name = "Solidity Prettier Check";
      entry = "sh -c 'cd contracts/evm && bun run prettier:check'";
      files = "contracts/evm/.*\\.(json|md|yml)$";
      types = ["file"];
      language = "system";
    };
  };

  scripts = {
    # Generate a changelog

    changelog.exec = "git-cliff > CHANGELOG.md";
    flamechart.exec = "cat node/tracing.flame | inferno-flamegraph > flamegraph.svg";
    flamegraph.exec = "cat node/tracing.flame | inferno-flamegraph --flamechart > flamechart.svg";

    # nomicfoundation-solidity-language-server.exec = "bun run $(git rev-parse --show-toplevel)/contracts/evm/node_modules/@nomicfoundation/solidity-language-server/out/index.js --stdio";
    # solidity-language-server.exec = "nomicfoundation-solidity-language-server";

    evm-build = {
      exec = "cd $(git rev-parse --show-toplevel)/contracts/evm && bun run build";
      description = "Build evm contracts";
    };

    evm-lint = {
      exec = "cd $(git rev-parse --show-toplevel)/contracts/evm && bun run lint";
      description = "Lint evm contracts using forge and solhint";
    };

    evm-lint-fix = {
      exec = "cd $(git rev-parse --show-toplevel)/contracts/evm && bun run lint:fix";
      description = "Lazy fix some EVM lint issues, formatting and basic hints";
    };

    evm-test = {
      exec = "cd $(git rev-parse --show-toplevel)/contracts/evm && bun run test";
      description = "Test EVM Contracts";
    };

    evm-test-coverage = {
      exec = "cd $(git rev-parse --show-toplevel)/contracts/evm && bun run test:coverage";
      description = "Test EVM Contracts and generate coverage";
    };

    evm-test-coverage-report = {
      exec = "cd $(git rev-parse --show-toplevel)/contracts/evm && bun run test:coverage:report";
      description = "Generate EVM Contract coverage report for use in codecov";
    };

    evm-deploy-e2e.exec = ''
      evm-script Deploy
    '';

    evm-verify-e2e.exec = ''
      function ver() {
        cd $(git rev-parse --show-toplevel)/contracts/evm && forge verify-contract $(cat deployments.json | jq -r .$1) $2 --chain $3 --verifier sourcify
      }
      ver xvault XVault arbitrum-sepolia
      ver vault Vault arbitrum-sepolia

      ver publisher Publisher arbitrum-sepolia
      ver channelSubscriber Subscriber arbitrum-sepolia

      ver eigenModule EigenModule holesky
      ver parameters Parameters holesky
      ver subscriber Subscriber holesky
      ver channelPublisher Publisher holesky
      ver baseVault BaseVault holesky
      ver baseProtocol BaseProtocol holesky
      ver nuffAccountImpl NuffleAccount holesky
      ver nuffPortfolio NufflePortfolio holesky
      ver channelAdapter ChannelAdapter holesky
      ver router Router holesky
    '';

    evm-script = {
      exec = ''
        evm-script-chain $1 holesky
      '';
    };

    evm-script-chain = {
      exec = ''
        cd $(git rev-parse --show-toplevel)/contracts/evm && \
          forge script $1 \
           --account $KEYSTORE --sender $SENDER \
           --chain $2 -f $2  \
           --broadcast -vvvv
      '';
    };

    evm-verify = {
      exec = ''
        evm-verify-chain $1 holesky
      '';
    };

    evm-verify-chain = {
      exec = ''
        cd $(git rev-parse --show-toplevel)/contracts/evm && \
          forge script $1 \
           --account $KEYSTORE --sender $SENDER \
           --chain $2 -f $2  \
           --resume --verifier sourcify --verify
      '';
    };

    evm-deploy-e2e-local = {
      exec = ''
        evm-script-local Deploy local
      '';
    };

    evm-script-local = {
      exec = ''
        cd $(git rev-parse --show-toplevel)/contracts/evm && \
          forge script $1 \
           --account dev --sender $SENDER \
           -f $2 \
           --broadcast --verifier sourcify --verify --verifier-url http://localhost:3000/api/verify

      '';
    };

    evm-script-transmit-reponse.exec = ''
      forge script TransmitResponse $ORIGIN_GUID $FEE_VALUE --sig 'run(bytes32,uint256)' \
        --account $KEYSTORE --sender $SENDER \
        --chain holesky -f holesky  \
        --broadcast
    '';

    init-keystore = {
      exec = ''
        export WALLET=$(cast w n --json | jq '.[0]') && \
        cast w i dev --private-key $(echo $WALLET | jq -r .private_key)
      '';
      description = "Initialize keystore";
    };

    replay-call.exec = "❯ cast call 0x6edce65403992e310a62460808c4b910d972f10f --data $1 --rpc-url https://ethereum-holesky-rpc.publicnode.com --trace";

    slither-checklist = {
      exec = "docker run -v \"$PWD\":/home/common trailofbits/eth-security-toolbox bash -c \"cd /home/common && slither src/ --skip-assembly --exclude-dependencies --checklist --filter-paths node_modules/ > slither-checklist.md\"";
      description = "Generate slither analysis checklist";
    };

    update-devenv.exec = "nix-env -iA devenv -f https://github.com/NixOS/nixpkgs/tarball/nixpkgs-unstable";
  };
  # processes = {
  # evm-holesky-fork = {
  #   exec = "cd $(git rev-parse --show-toplevel)/contracts/evm && bun run dev-holesky";
  # };
  # evm-localnet-base = {
  #   exec = "cd $(git rev-parse --show-toplevel)/contracts/evm && bun run dev";
  # };
  # evm-localnet-remote = {
  #   exec = "cd $(git rev-parse --show-toplevel)/contracts/evm && bun run dev-remote";
  # }; # otterscan-dev.exec = ''
  #   docker run --rm \
  #     -p 5100:80 \
  #     --name otterscan \
  #     -e REACT_APP_REPOSITORY_SERVER_URL=http://localhost:5555/repository \
  #     -e VITE_CONFIG_JSON='
  #       {
  #         "erigonURL": "http://0.0.0.0:8545",
  #         "beaconAPI": "http://your-beacon-node-ip:5052",
  #         "assetsURLPrefix": "http://localhost:5175",
  #         "experimentalFixedChainId": 11155111,
  #         "chainInfo": {
  #           "name": "Holesky Testnet",
  #           "faucets": [],
  #           "nativeCurrency": {
  #             "name": "Sepolia Ether",
  #             "symbol": "SEPETH",
  #             "decimals": 18
  #           }
  #         },
  #         "sourcifySources": {
  #           "ipfs": "http://0.0.0.0:5555/repository",
  #           "central_server": "http://0.0.0.0:5555/repository"
  #         }
  #       }
  #     ' \
  #     otterscan/otterscan:latest
  # '';
  # sourcify.exec = ''
  #   docker run  --rm \
  #       --network host \
  #       -p 5555:5555 \
  #       -v $(git rev-parse --show-toplevel)/contracts/evm/tests/sourcify/sourcify-chains.json:/home/app/services/server/dist/sourcify-chains.json \
  #       -v $(git rev-parse --show-toplevel)/contracts/evm/tests/sourcify/local.js:/home/app/services/server/dist/config/local.js \
  #       -e NODE_CONFIG_ENV=local \
  #       --env-file contracts/evm/tests/sourcify/.env ghcr.io/ethereum/sourcify/server:latest
  # '';
  # };
  process.managers.process-compose.unixSocket.enable = false;
  process.manager.implementation = "overmind";

  # Exclude the source repo to make the container smaller.
  containers."processes".copyToRoot = [];
  containers = {};
}
