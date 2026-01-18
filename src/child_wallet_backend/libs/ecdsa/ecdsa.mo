import Cycles "mo:base/ExperimentalCycles";
import Error "mo:base/Error";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Debug "mo:base/Debug";

module {
  // Only the ecdsa methods in the IC management canister is required here.
  public type IC = actor {
    ecdsa_public_key : ({
      canister_id : ?Principal;
      derivation_path : [Blob];
      key_id : { curve : { #secp256k1 }; name : Text };
    }) -> async ({ public_key : Blob; chain_code : Blob });
    sign_with_ecdsa : ({
      message_hash : Blob;
      derivation_path : [Blob];
      key_id : { curve : { #secp256k1 }; name : Text };
    }) -> async ({ signature : Blob });
  };

  let ic : IC = actor("aaaaa-aa");

  private func derivation_path_for(caller : Blob, index : Nat32) : [Blob] {
    let index_text : Text = "+" # Nat32.toText(index);
    let index_blob : Blob = Text.encodeUtf8(index_text);
    [caller, index_blob];
  };

  public func public_key(_caller : Principal, index : Nat32) : async [Nat8] {
    Debug.print("=== ecdsa public_key ===");
    let caller = Principal.toBlob(_caller);
    Debug.print("caller: " # debug_show (caller));
    try {
      let { public_key } = await ic.ecdsa_public_key({
        canister_id = null;
        derivation_path = derivation_path_for(caller, index);
        key_id = { curve = #secp256k1; name = "dfx_test_key" };
      });
      return Blob.toArray(public_key);
    } catch (err) {
      let msg = Error.message(err);
      throw Error.reject(msg);
    };
  };

  public func sign(_caller : Principal, message : Blob) : async [Nat8] {
    let caller = Principal.toBlob(_caller);
    try {
      // Cycles.add(25_000_000_000);
      let { signature } = await ic.sign_with_ecdsa({
        message_hash = message;
        derivation_path = derivation_path_for(caller, 0 : Nat32);
        key_id = { curve = #secp256k1; name = "dfx_test_key" };
      });
      return Blob.toArray(signature);
    } catch (err) {
      let msg = Error.message(err);
      throw Error.reject(msg);
    };
  };
};
