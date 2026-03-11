{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };
  outputs = { self, nixpkgs }: 

  let
    pkgs = nixpkgs.legacyPackages.x86_64-linux;

    deps = [
      pkgs.pnpm
    ];
  in {
    devShells.x86_64-linux.default = pkgs.mkShell {
      buildInputs = deps ++ [ pkgs.process-compose ];
      shellHook = ''
        pnpm install
      '';
    };
 };
}