import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";

module {
  public type PublicKeyReply = {
    publicKey : [Nat8];
  };

  public type SignatureReply = {
    signature : [Nat8];
  };

  public type Environment = {
    #Development;
    #Staging;
    #Production;
  };

  public type Config = {
    env : Environment;
    keyName : Text;
    signCycles : Nat64;
  };

  public type PublicKeyListForPerson = HashMap.HashMap<Nat32, [Nat8]>;
  public type PublicKeyList = HashMap.HashMap<Principal, PublicKeyListForPerson>;

  public type State = {
    publicKeyList : PublicKeyList;
    config : Config;
  };
};
